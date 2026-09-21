from datetime import date, datetime, timedelta
from typing import Literal
from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, Field
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload
from .database import get_db, settings
from .models import Appointment, Invoice, Patient, ScheduleOverride, Therapist, User

app = FastAPI(title="PhysioDesk API", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:3000"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2 = OAuth2PasswordBearer(tokenUrl="auth/login")

class Token(BaseModel): access_token: str; token_type: str; user: dict
class PatientIn(BaseModel):
    name: str = Field(min_length=2, max_length=120); phone: str = Field(min_length=5, max_length=30)
    age: int = Field(ge=0, le=130); gender: str; address: str = ""; condition: str
    therapist_id: int | None = None; package: str = "Standard"; status: Literal["Active", "Completed", "On hold"] = "Active"
class PatientUpdate(PatientIn): pass
class TherapistIn(BaseModel):
    name: str; specialty: str; working_days: str = "0,1,2,3,4"; start_time: str = "09:00"; end_time: str = "17:00"; slot_duration: int = Field(default=60, ge=15, le=180); active: bool = True
class AppointmentIn(BaseModel):
    patient_id: int; therapist_id: int; date: date; time: str; payment_method: str = "Cash"; notes: str = ""; session_type: str = "Physiotherapy session"; status: Literal["Booked", "Completed", "Cancelled"] = "Booked"
class InvoiceIn(BaseModel):
    patient_id: int; service: str; amount: float = Field(gt=0); discount: float = Field(default=0, ge=0); status: Literal["Paid", "Due", "Void"] = "Due"; payment_method: str = "Cash"
class OverrideIn(BaseModel):
    date: date; is_off: bool = False; start_time: str | None = None; end_time: str | None = None

def public_user(user: User): return {"id": user.id, "name": user.name, "email": user.email, "role": user.role}
def serialize_patient(p: Patient): return {"id":p.id,"name":p.name,"phone":p.phone,"age":p.age,"gender":p.gender,"address":p.address,"condition":p.condition,"therapist_id":p.therapist_id,"therapist_name":p.therapist.name if p.therapist else None,"package":p.package,"status":p.status,"created_at":p.created_at}
def serialize_therapist(t: Therapist, seen=0): return {"id":t.id,"name":t.name,"specialty":t.specialty,"working_days":t.working_days,"start_time":t.start_time,"end_time":t.end_time,"slot_duration":t.slot_duration,"active":t.active,"patients_seen_today":seen}
def serialize_appointment(a: Appointment): return {"id":a.id,"patient_id":a.patient_id,"patient_name":a.patient.name,"therapist_id":a.therapist_id,"therapist_name":a.therapist.name,"date":a.date,"time":a.time,"payment_method":a.payment_method,"notes":a.notes,"session_type":a.session_type,"status":a.status}
def serialize_invoice(i: Invoice): return {"id":i.id,"patient_id":i.patient_id,"patient_name":i.patient.name,"service":i.service,"amount":float(i.amount),"discount":float(i.discount),"total":float(i.amount-i.discount),"status":i.status,"payment_method":i.payment_method,"issued_at":i.issued_at}

def current_user(token: str = Depends(oauth2), db: Session = Depends(get_db)):
    try: email = jwt.decode(token, settings.secret_key, algorithms=["HS256"]).get("sub")
    except JWTError: email = None
    user = db.scalar(select(User).where(User.email == email)) if email else None
    if not user or not user.active: raise HTTPException(status_code=401, detail="Invalid or expired session")
    return user
def admin(user: User = Depends(current_user)):
    if user.role != "admin": raise HTTPException(status_code=403, detail="Administrator access required")
    return user
def billing_user(user: User = Depends(current_user)):
    if user.role != "admin": raise HTTPException(status_code=403, detail="Billing is restricted to administrators")
    return user
def get_or_404(db, model, item_id):
    item = db.get(model, item_id)
    if not item: raise HTTPException(status_code=404, detail="Record not found")
    return item

def slots_for(t: Therapist, target: date, db: Session):
    override = db.scalar(select(ScheduleOverride).where(ScheduleOverride.therapist_id == t.id, ScheduleOverride.date == target))
    if override and override.is_off: return []
    if not override and str(target.weekday()) not in t.working_days.split(","): return []
    start, end = (override.start_time or t.start_time, override.end_time or t.end_time) if override else (t.start_time, t.end_time)
    cursor = datetime.strptime(start, "%H:%M"); finish = datetime.strptime(end, "%H:%M"); result=[]
    while cursor < finish:
        result.append(cursor.strftime("%H:%M")); cursor += timedelta(minutes=t.slot_duration)
    return result

def assert_slot_available(payload: AppointmentIn, db: Session, excluding: int | None = None):
    t = get_or_404(db, Therapist, payload.therapist_id)
    get_or_404(db, Patient, payload.patient_id)
    if not t.active or payload.time not in slots_for(t, payload.date, db): raise HTTPException(status_code=422, detail="Therapist is not available at this time")
    q = select(Appointment).where(Appointment.therapist_id == payload.therapist_id, Appointment.date == payload.date, Appointment.time == payload.time, Appointment.status != "Cancelled")
    if excluding: q = q.where(Appointment.id != excluding)
    if db.scalar(q): raise HTTPException(status_code=409, detail="This therapist already has a booking in that slot")

@app.get("/health")
def health(): return {"status":"ok"}
@app.post("/auth/login", response_model=Token)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == form.username))
    if not user or not pwd.verify(form.password, user.password_hash): raise HTTPException(status_code=401, detail="Incorrect email or password", headers={"WWW-Authenticate":"Bearer"})
    expires = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
    token = jwt.encode({"sub":user.email,"exp":expires}, settings.secret_key, algorithm="HS256")
    return Token(access_token=token, token_type="bearer", user=public_user(user))
@app.get("/auth/me")
def me(user: User = Depends(current_user)): return public_user(user)

@app.get("/dashboard")
def dashboard(target_date: date = Query(default_factory=date.today), db: Session = Depends(get_db), _: User = Depends(current_user)):
    appointments = db.scalars(select(Appointment).options(joinedload(Appointment.patient), joinedload(Appointment.therapist)).where(Appointment.date == target_date, Appointment.status != "Cancelled")).all()
    active_therapists = db.scalars(select(Therapist).where(Therapist.active == True)).all()
    capacity=[]; total_slots=0
    for t in active_therapists:
        slots = slots_for(t, target_date, db); booked = sum(a.therapist_id == t.id for a in appointments)
        if slots: capacity.append({**serialize_therapist(t), "booked":booked,"free":len(slots)-booked,"slots":slots})
        total_slots += len(slots)
    revenue = db.scalar(select(func.coalesce(func.sum(Invoice.amount - Invoice.discount), 0)).where(func.date(Invoice.issued_at) == target_date, Invoice.status == "Paid"))
    recent = db.scalars(select(Patient).options(joinedload(Patient.therapist)).order_by(Patient.created_at.desc()).limit(6)).all()
    return {"stats":{"patients_seen":len({a.patient_id for a in appointments if a.status == "Completed"}),"therapists_on_duty":len(capacity),"revenue":float(revenue),"open_slots":total_slots-len(appointments)},"capacity":capacity,"recent_patients":[serialize_patient(p) for p in recent]}

@app.get("/patients")
def list_patients(search: str = "", therapist_id: int | None = None, patient_status: str | None = Query(None, alias="status"), db: Session = Depends(get_db), _: User = Depends(current_user)):
    q = select(Patient).options(joinedload(Patient.therapist)).order_by(Patient.created_at.desc())
    if search: q=q.where(or_(Patient.name.ilike(f"%{search}%"), Patient.phone.ilike(f"%{search}%")))
    if therapist_id: q=q.where(Patient.therapist_id == therapist_id)
    if patient_status: q=q.where(Patient.status == patient_status)
    return [serialize_patient(p) for p in db.scalars(q).all()]
@app.post("/patients", status_code=201)
def create_patient(data: PatientIn, db: Session = Depends(get_db), _: User = Depends(current_user)):
    if data.therapist_id: get_or_404(db, Therapist, data.therapist_id)
    p=Patient(**data.model_dump()); db.add(p); db.commit(); db.refresh(p); return serialize_patient(p)
@app.get("/patients/{patient_id}")
def patient_detail(patient_id: int, db: Session = Depends(get_db), _: User = Depends(current_user)):
    p=get_or_404(db, Patient, patient_id); p=db.scalar(select(Patient).options(joinedload(Patient.therapist)).where(Patient.id==p.id))
    appts=db.scalars(select(Appointment).options(joinedload(Appointment.therapist), joinedload(Appointment.patient)).where(Appointment.patient_id==p.id).order_by(Appointment.date.desc())).all()
    invoices=db.scalars(select(Invoice).options(joinedload(Invoice.patient)).where(Invoice.patient_id==p.id).order_by(Invoice.issued_at.desc())).all()
    return {"patient":serialize_patient(p),"sessions":[serialize_appointment(a) for a in appts],"invoices":[serialize_invoice(i) for i in invoices]}
@app.put("/patients/{patient_id}")
def update_patient(patient_id: int, data: PatientUpdate, db: Session = Depends(get_db), _: User = Depends(current_user)):
    p=get_or_404(db, Patient, patient_id)
    if data.therapist_id: get_or_404(db, Therapist, data.therapist_id)
    for key,value in data.model_dump().items(): setattr(p,key,value)
    db.commit(); db.refresh(p); return serialize_patient(p)
@app.delete("/patients/{patient_id}", status_code=204)
def delete_patient(patient_id: int, db: Session = Depends(get_db), _: User = Depends(current_user)):
    p=get_or_404(db, Patient, patient_id)
    if db.scalar(select(Appointment.id).where(Appointment.patient_id == p.id)) or db.scalar(select(Invoice.id).where(Invoice.patient_id == p.id)): raise HTTPException(status_code=409, detail="Cannot delete a patient with appointment or invoice history")
    db.delete(p); db.commit()

@app.get("/therapists")
def list_therapists(db: Session = Depends(get_db), _: User = Depends(current_user)):
    today=date.today(); therapists=db.scalars(select(Therapist).where(Therapist.active==True).order_by(Therapist.name)).all()
    return [serialize_therapist(t, db.scalar(select(func.count(Appointment.id)).where(Appointment.therapist_id==t.id, Appointment.date==today, Appointment.status=="Completed")) or 0) for t in therapists]
@app.post("/therapists", status_code=201)
def create_therapist(data: TherapistIn, db: Session = Depends(get_db), _: User = Depends(admin)):
    t=Therapist(**data.model_dump()); db.add(t); db.commit(); db.refresh(t); return serialize_therapist(t)
@app.put("/therapists/{therapist_id}")
def update_therapist(therapist_id: int, data: TherapistIn, db: Session = Depends(get_db), _: User = Depends(admin)):
    t=get_or_404(db,Therapist,therapist_id)
    for key,value in data.model_dump().items(): setattr(t,key,value)
    db.commit(); return serialize_therapist(t)
@app.delete("/therapists/{therapist_id}", status_code=204)
def delete_therapist(therapist_id: int, db: Session = Depends(get_db), _: User = Depends(admin)):
    t=get_or_404(db,Therapist,therapist_id)
    if db.scalar(select(Appointment.id).where(Appointment.therapist_id==t.id)): raise HTTPException(status_code=409, detail="Therapists with appointment history cannot be deleted; deactivate them instead")
    db.delete(t); db.commit()
@app.post("/therapists/{therapist_id}/overrides")
def override(therapist_id: int, data: OverrideIn, db: Session = Depends(get_db), _: User = Depends(admin)):
    get_or_404(db,Therapist,therapist_id); current=db.scalar(select(ScheduleOverride).where(ScheduleOverride.therapist_id==therapist_id, ScheduleOverride.date==data.date))
    if not current: current=ScheduleOverride(therapist_id=therapist_id,date=data.date); db.add(current)
    for key,value in data.model_dump().items(): setattr(current,key,value)
    db.commit(); return {"id":current.id,"therapist_id":therapist_id,**data.model_dump()}

@app.get("/appointments")
def appointments(target_date: date = Query(default_factory=date.today, alias="date"), db: Session = Depends(get_db), _: User = Depends(current_user)):
    therapists=db.scalars(select(Therapist).where(Therapist.active==True).order_by(Therapist.name)).all()
    booked=db.scalars(select(Appointment).options(joinedload(Appointment.patient),joinedload(Appointment.therapist)).where(Appointment.date==target_date)).all()
    rows=[]
    for t in therapists:
        by_time={a.time:a for a in booked if a.therapist_id==t.id and a.status != "Cancelled"}
        slots=slots_for(t,target_date,db)
        rows.append({"therapist":serialize_therapist(t),"off":not bool(slots),"slots":[{"time":s,"appointment":serialize_appointment(by_time[s]) if s in by_time else None} for s in slots]})
    return {"date":target_date,"therapists":rows}
@app.post("/appointments", status_code=201)
def create_appointment(data: AppointmentIn, db: Session = Depends(get_db), _: User = Depends(current_user)):
    assert_slot_available(data,db); a=Appointment(**data.model_dump()); db.add(a)
    try: db.commit()
    except IntegrityError: db.rollback(); raise HTTPException(status_code=409, detail="This slot was just booked by another user")
    return serialize_appointment(db.scalar(select(Appointment).options(joinedload(Appointment.patient),joinedload(Appointment.therapist)).where(Appointment.id==a.id)))
@app.put("/appointments/{appointment_id}")
def update_appointment(appointment_id: int, data: AppointmentIn, db: Session = Depends(get_db), _: User = Depends(current_user)):
    a=get_or_404(db,Appointment,appointment_id); assert_slot_available(data,db,appointment_id)
    for key,value in data.model_dump().items(): setattr(a,key,value)
    db.commit(); return serialize_appointment(db.scalar(select(Appointment).options(joinedload(Appointment.patient),joinedload(Appointment.therapist)).where(Appointment.id==a.id)))

@app.get("/invoices")
def invoices(invoice_status: str | None = Query(None, alias="status"), db: Session = Depends(get_db), _: User = Depends(billing_user)):
    q=select(Invoice).options(joinedload(Invoice.patient)).order_by(Invoice.issued_at.desc())
    if invoice_status:q=q.where(Invoice.status==invoice_status)
    return [serialize_invoice(i) for i in db.scalars(q).all()]
@app.post("/invoices", status_code=201)
def create_invoice(data: InvoiceIn, db: Session = Depends(get_db), _: User = Depends(billing_user)):
    get_or_404(db,Patient,data.patient_id); i=Invoice(**data.model_dump());db.add(i);db.commit();db.refresh(i);return serialize_invoice(db.scalar(select(Invoice).options(joinedload(Invoice.patient)).where(Invoice.id==i.id)))
@app.put("/invoices/{invoice_id}")
def update_invoice(invoice_id: int,data: InvoiceIn,db: Session = Depends(get_db),_: User = Depends(billing_user)):
    i=get_or_404(db,Invoice,invoice_id);get_or_404(db,Patient,data.patient_id)
    for key,value in data.model_dump().items():setattr(i,key,value)
    db.commit();return serialize_invoice(db.scalar(select(Invoice).options(joinedload(Invoice.patient)).where(Invoice.id==i.id)))
@app.delete("/invoices/{invoice_id}",status_code=204)
def delete_invoice(invoice_id:int,db:Session=Depends(get_db),_:User=Depends(billing_user)):
    db.delete(get_or_404(db,Invoice,invoice_id));db.commit()
