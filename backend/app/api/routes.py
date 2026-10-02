from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload
from ..database import get_db
from ..models import Appointment, Invoice, Package, Patient, ScheduleOverride, Therapist, User
from ..schemas import Token, PatientIn, PatientUpdate, TherapistIn, PackageIn, AppointmentIn, InvoiceIn, OverrideIn
from ..core.security import current_user, admin, billing_user, authenticate_user, create_access_token
from ..services.common import get_or_404, required_record, slots_for, validate_appointment_slot, assert_slot_available, resolve_patient_package, invoice_values
from ..schemas.serializers import public_user, serialize_package, serialize_patient, serialize_therapist, serialize_appointment, serialize_invoice

router = APIRouter()

@router.post("/auth/login", response_model=Token)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = authenticate_user(form, db)
    return Token(access_token=create_access_token(user.email), token_type="bearer", user=public_user(user))


@router.get("/auth/me")
def me(user: User = Depends(current_user)):
    return public_user(user)


@router.get("/dashboard")
def dashboard(target_date: date = Query(default_factory=date.today), db: Session = Depends(get_db), _: User = Depends(current_user)):
    appointments = db.scalars(select(Appointment).options(joinedload(Appointment.patient), joinedload(Appointment.therapist)).where(Appointment.date == target_date, Appointment.status != "Cancelled")).all()
    active_therapists = db.scalars(select(Therapist).where(Therapist.active == True)).all()
    capacity = []
    total_slots = 0
    for therapist in active_therapists:
        slots = slots_for(therapist, target_date, db)
        booked = sum(appointment.therapist_id == therapist.id for appointment in appointments)
        if slots:
            capacity.append({**serialize_therapist(therapist), "booked": booked, "free": len(slots) - booked, "slots": slots})
        total_slots += len(slots)
    revenue = db.scalar(select(func.coalesce(func.sum(Invoice.amount - Invoice.discount), 0)).where(func.date(Invoice.issued_at) == target_date, Invoice.status == "Paid"))
    recent = db.scalars(select(Patient).options(joinedload(Patient.therapist), joinedload(Patient.package_record)).order_by(Patient.created_at.desc()).limit(6)).all()
    return {"stats": {"patients_seen": len({appointment.patient_id for appointment in appointments if appointment.status == "Completed"}), "therapists_on_duty": len(capacity), "revenue": float(revenue or 0), "open_slots": total_slots - len(appointments)}, "capacity": capacity, "recent_patients": [serialize_patient(patient) for patient in recent]}


@router.get("/packages")
def list_packages(active_only: bool = True, db: Session = Depends(get_db), _: User = Depends(current_user)):
    query = select(Package).order_by(Package.name)
    if active_only:
        query = query.where(Package.active == True)
    return [serialize_package(package) for package in db.scalars(query).all()]


@router.post("/packages", status_code=201)
def create_package(data: PackageIn, db: Session = Depends(get_db), _: User = Depends(admin)):
    package = Package(**data.model_dump())
    db.add(package)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="A package with this name already exists")
    db.refresh(package)
    return serialize_package(package)


@router.put("/packages/{package_id}")
def update_package(package_id: int, data: PackageIn, db: Session = Depends(get_db), _: User = Depends(admin)):
    package = get_or_404(db, Package, package_id)
    for key, value in data.model_dump().items():
        setattr(package, key, value)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="A package with this name already exists")
    db.refresh(package)
    return serialize_package(package)


@router.delete("/packages/{package_id}", status_code=204)
def delete_package(package_id: int, db: Session = Depends(get_db), _: User = Depends(admin)):
    package = get_or_404(db, Package, package_id)
    if db.scalar(select(Patient.id).where(Patient.package_id == package.id)) or db.scalar(select(Invoice.id).where(Invoice.package_id == package.id)):
        raise HTTPException(status_code=409, detail="Packages assigned to patients or invoices cannot be deleted; deactivate them instead")
    db.delete(package)
    db.commit()


@router.get("/patients")
def list_patients(search: str = "", therapist_id: int | None = None, patient_status: str | None = Query(None, alias="status"), db: Session = Depends(get_db), _: User = Depends(current_user)):
    query = select(Patient).options(joinedload(Patient.therapist), joinedload(Patient.package_record)).order_by(Patient.created_at.desc())
    if search:
        query = query.where(or_(Patient.name.ilike(f"%{search}%"), Patient.phone.ilike(f"%{search}%")))
    if therapist_id:
        query = query.where(Patient.therapist_id == therapist_id)
    if patient_status:
        query = query.where(Patient.status == patient_status)
    return [serialize_patient(patient) for patient in db.scalars(query).all()]


@router.get("/patients/available")
def available_patients(unassigned: bool = False, db: Session = Depends(get_db), _: User = Depends(current_user)):
    query = select(Patient).options(joinedload(Patient.therapist), joinedload(Patient.package_record)).where(Patient.status == "Active").order_by(Patient.name)
    if unassigned:
        query = query.where(Patient.therapist_id == None)
    return [serialize_patient(patient) for patient in db.scalars(query).all()]


@router.post("/patients", status_code=201)
def create_patient(data: PatientIn, db: Session = Depends(get_db), _: User = Depends(current_user)):
    has_initial_appointment = data.appointment_date is not None or data.appointment_time is not None
    if has_initial_appointment and (data.appointment_date is None or not data.appointment_time):
        raise HTTPException(status_code=422, detail="Initial appointments require both appointment_date and appointment_time")
    if has_initial_appointment and data.therapist_id is None:
        raise HTTPException(status_code=422, detail="An initial appointment requires a selected therapist")
    if data.therapist_id:
        get_or_404(db, Therapist, data.therapist_id)
    if has_initial_appointment:
        # The preceding checks narrow these optional request fields before use.
        assert data.therapist_id is not None
        assert data.appointment_date is not None
        assert data.appointment_time is not None
        validate_appointment_slot(data.therapist_id, data.appointment_date, data.appointment_time, db)

    patient = Patient(**resolve_patient_package(data, db))
    db.add(patient)
    try:
        db.flush()
        if has_initial_appointment:
            db.add(Appointment(patient_id=patient.id, therapist_id=data.therapist_id, date=data.appointment_date, time=data.appointment_time, payment_method=data.appointment_payment_method, notes=data.appointment_notes))
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="This slot was just booked by another user")
    saved_patient = required_record(db.scalar(select(Patient).options(joinedload(Patient.therapist), joinedload(Patient.package_record)).where(Patient.id == patient.id)))
    return serialize_patient(saved_patient)


@router.get("/patients/{patient_id}")
def patient_detail(patient_id: int, db: Session = Depends(get_db), _: User = Depends(current_user)):
    patient = db.scalar(select(Patient).options(joinedload(Patient.therapist), joinedload(Patient.package_record)).where(Patient.id == patient_id))
    if not patient:
        raise HTTPException(status_code=404, detail="Record not found")
    appointments = db.scalars(select(Appointment).options(joinedload(Appointment.therapist), joinedload(Appointment.patient).joinedload(Patient.package_record)).where(Appointment.patient_id == patient.id).order_by(Appointment.date.desc(), Appointment.time.desc())).all()
    invoices = db.scalars(select(Invoice).options(joinedload(Invoice.patient), joinedload(Invoice.package)).where(Invoice.patient_id == patient.id).order_by(Invoice.issued_at.desc())).all()
    overview = serialize_patient(patient)
    return {"patient": overview, "overview": overview, "sessions": [serialize_appointment(appointment) for appointment in appointments], "invoices": [serialize_invoice(invoice) for invoice in invoices]}


@router.put("/patients/{patient_id}")
def update_patient(patient_id: int, data: PatientUpdate, db: Session = Depends(get_db), _: User = Depends(current_user)):
    patient = get_or_404(db, Patient, patient_id)
    if data.therapist_id:
        get_or_404(db, Therapist, data.therapist_id)
    for key, value in resolve_patient_package(data, db).items():
        setattr(patient, key, value)
    db.commit()
    saved_patient = required_record(db.scalar(select(Patient).options(joinedload(Patient.therapist), joinedload(Patient.package_record)).where(Patient.id == patient.id)))
    return serialize_patient(saved_patient)


@router.delete("/patients/{patient_id}", status_code=204)
def delete_patient(patient_id: int, db: Session = Depends(get_db), _: User = Depends(current_user)):
    patient = get_or_404(db, Patient, patient_id)
    if db.scalar(select(Appointment.id).where(Appointment.patient_id == patient.id)) or db.scalar(select(Invoice.id).where(Invoice.patient_id == patient.id)):
        raise HTTPException(status_code=409, detail="Cannot delete a patient with appointment or invoice history")
    db.delete(patient)
    db.commit()


@router.get("/therapists")
def list_therapists(include_inactive: bool = False, db: Session = Depends(get_db), user: User = Depends(current_user)):
    today = date.today()
    query = select(Therapist).order_by(Therapist.name)
    if not (include_inactive and user.role == "admin"):
        query = query.where(Therapist.active == True)
    therapists = db.scalars(query).all()
    return [serialize_therapist(therapist, db.scalar(select(func.count(Appointment.id)).where(Appointment.therapist_id == therapist.id, Appointment.date == today, Appointment.status == "Completed")) or 0) for therapist in therapists]


@router.get("/therapists/available")
def available_therapists(target_date: date = Query(alias="date"), time: str = Query(), db: Session = Depends(get_db), _: User = Depends(current_user)):
    therapists = db.scalars(select(Therapist).where(Therapist.active == True).order_by(Therapist.name)).all()
    booked_ids = set(db.scalars(select(Appointment.therapist_id).where(Appointment.date == target_date, Appointment.time == time, Appointment.status != "Cancelled")).all())
    return [serialize_therapist(therapist) for therapist in therapists if therapist.id not in booked_ids and time in slots_for(therapist, target_date, db)]


@router.post("/therapists", status_code=201)
def create_therapist(data: TherapistIn, db: Session = Depends(get_db), _: User = Depends(admin)):
    therapist = Therapist(**data.model_dump())
    db.add(therapist)
    db.commit()
    db.refresh(therapist)
    return serialize_therapist(therapist)


@router.put("/therapists/{therapist_id}")
def update_therapist(therapist_id: int, data: TherapistIn, db: Session = Depends(get_db), _: User = Depends(admin)):
    therapist = get_or_404(db, Therapist, therapist_id)
    for key, value in data.model_dump().items():
        setattr(therapist, key, value)
    db.commit()
    return serialize_therapist(therapist)


@router.delete("/therapists/{therapist_id}", status_code=204)
def delete_therapist(therapist_id: int, db: Session = Depends(get_db), _: User = Depends(admin)):
    therapist = get_or_404(db, Therapist, therapist_id)
    if db.scalar(select(Appointment.id).where(Appointment.therapist_id == therapist.id)):
        raise HTTPException(status_code=409, detail="Therapists with appointment history cannot be deleted; deactivate them instead")
    db.delete(therapist)
    db.commit()


@router.post("/therapists/{therapist_id}/overrides")
def override(therapist_id: int, data: OverrideIn, db: Session = Depends(get_db), _: User = Depends(admin)):
    get_or_404(db, Therapist, therapist_id)
    current = db.scalar(select(ScheduleOverride).where(ScheduleOverride.therapist_id == therapist_id, ScheduleOverride.date == data.date))
    if not current:
        current = ScheduleOverride(therapist_id=therapist_id, date=data.date)
        db.add(current)
    for key, value in data.model_dump().items():
        setattr(current, key, value)
    db.commit()
    return {"id": current.id, "therapist_id": therapist_id, **data.model_dump()}


@router.get("/appointments")
def appointments(target_date: date = Query(default_factory=date.today, alias="date"), db: Session = Depends(get_db), _: User = Depends(current_user)):
    therapists = db.scalars(select(Therapist).where(Therapist.active == True).order_by(Therapist.name)).all()
    booked = db.scalars(select(Appointment).options(joinedload(Appointment.patient).joinedload(Patient.package_record), joinedload(Appointment.therapist)).where(Appointment.date == target_date)).all()
    rows = []
    for therapist in therapists:
        by_time = {appointment.time: appointment for appointment in booked if appointment.therapist_id == therapist.id and appointment.status != "Cancelled"}
        slots = slots_for(therapist, target_date, db)
        rows.append({"therapist": serialize_therapist(therapist), "off": not bool(slots), "slots": [{"time": slot, "appointment": serialize_appointment(by_time[slot]) if slot in by_time else None} for slot in slots]})
    return {"date": target_date, "therapists": rows}


@router.post("/appointments", status_code=201)
def create_appointment(data: AppointmentIn, db: Session = Depends(get_db), _: User = Depends(current_user)):
    patient = assert_slot_available(data, db)
    if patient.therapist_id is None:
        patient.therapist_id = data.therapist_id
    appointment = Appointment(**data.model_dump())
    db.add(appointment)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="This slot was just booked by another user")
    saved_appointment = required_record(db.scalar(select(Appointment).options(joinedload(Appointment.patient).joinedload(Patient.package_record), joinedload(Appointment.therapist)).where(Appointment.id == appointment.id)))
    return serialize_appointment(saved_appointment)


@router.put("/appointments/{appointment_id}")
def update_appointment(appointment_id: int, data: AppointmentIn, db: Session = Depends(get_db), _: User = Depends(current_user)):
    appointment = get_or_404(db, Appointment, appointment_id)
    assert_slot_available(data, db, appointment_id)
    for key, value in data.model_dump().items():
        setattr(appointment, key, value)
    db.commit()
    saved_appointment = required_record(db.scalar(select(Appointment).options(joinedload(Appointment.patient).joinedload(Patient.package_record), joinedload(Appointment.therapist)).where(Appointment.id == appointment.id)))
    return serialize_appointment(saved_appointment)


@router.get("/invoices")
def invoices(invoice_status: str | None = Query(None, alias="status"), db: Session = Depends(get_db), _: User = Depends(billing_user)):
    query = select(Invoice).options(joinedload(Invoice.patient), joinedload(Invoice.package)).order_by(Invoice.issued_at.desc())
    if invoice_status:
        query = query.where(Invoice.status == invoice_status)
    return [serialize_invoice(invoice) for invoice in db.scalars(query).all()]


@router.post("/invoices", status_code=201)
def create_invoice(data: InvoiceIn, db: Session = Depends(get_db), _: User = Depends(billing_user)):
    invoice = Invoice(**invoice_values(data, db))
    db.add(invoice)
    db.commit()
    saved_invoice = required_record(db.scalar(select(Invoice).options(joinedload(Invoice.patient), joinedload(Invoice.package)).where(Invoice.id == invoice.id)))
    return serialize_invoice(saved_invoice)


@router.put("/invoices/{invoice_id}")
def update_invoice(invoice_id: int, data: InvoiceIn, db: Session = Depends(get_db), _: User = Depends(billing_user)):
    invoice = get_or_404(db, Invoice, invoice_id)
    for key, value in invoice_values(data, db).items():
        setattr(invoice, key, value)
    db.commit()
    saved_invoice = required_record(db.scalar(select(Invoice).options(joinedload(Invoice.patient), joinedload(Invoice.package)).where(Invoice.id == invoice.id)))
    return serialize_invoice(saved_invoice)


@router.delete("/invoices/{invoice_id}", status_code=204)
def delete_invoice(invoice_id: int, db: Session = Depends(get_db), _: User = Depends(billing_user)):
    db.delete(get_or_404(db, Invoice, invoice_id))
    db.commit()
