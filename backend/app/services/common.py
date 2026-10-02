from datetime import date, datetime, timedelta
from typing import TypeVar
from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from ..models import Appointment, Package, Patient, ScheduleOverride, Therapist
from ..schemas import AppointmentIn, InvoiceIn, PatientFields
T=TypeVar("T")
def get_or_404(db: Session, model: type[T], item_id: int) -> T:
    item=db.get(model,item_id)
    if not item: raise HTTPException(status_code=404, detail="Record not found")
    return item
def required_record(item):
    if item is None: raise HTTPException(status_code=500, detail="Record was not found after saving")
    return item
def slots_for(therapist, target, db):
    override=db.scalar(select(ScheduleOverride).where(ScheduleOverride.therapist_id==therapist.id, ScheduleOverride.date==target))
    if override and override.is_off: return []
    if not override and str(target.weekday()) not in therapist.working_days.split(","): return []
    start,end=((override.start_time or therapist.start_time, override.end_time or therapist.end_time) if override else (therapist.start_time, therapist.end_time))
    cursor=datetime.strptime(start,"%H:%M"); finish=datetime.strptime(end,"%H:%M"); result=[]
    while cursor<finish: result.append(cursor.strftime("%H:%M")); cursor+=timedelta(minutes=therapist.slot_duration)
    return result
def validate_appointment_slot(therapist_id, appointment_date, appointment_time, db, excluding=None):
    therapist=get_or_404(db,Therapist,therapist_id)
    if not therapist.active or appointment_time not in slots_for(therapist,appointment_date,db): raise HTTPException(status_code=422, detail="Therapist is not available at this time")
    query=select(Appointment).where(Appointment.therapist_id==therapist_id,Appointment.date==appointment_date,Appointment.time==appointment_time,Appointment.status!="Cancelled")
    if excluding: query=query.where(Appointment.id!=excluding)
    if db.scalar(query): raise HTTPException(status_code=409, detail="This therapist already has a booking in that slot")
    return therapist
def assert_slot_available(payload, db, excluding=None):
    patient=get_or_404(db,Patient,payload.patient_id); validate_appointment_slot(payload.therapist_id,payload.date,payload.time,db,excluding); return patient
def resolve_patient_package(data: PatientFields, db):
    values=data.model_dump(exclude={"package_id","package","appointment_date","appointment_time","appointment_payment_method","appointment_notes"}); legacy=data.package.strip() if data.package else None
    if data.package_id is not None:
        package=get_or_404(db,Package,data.package_id)
        if not package.active: raise HTTPException(status_code=422, detail="The selected package is inactive")
        values.update(package_id=package.id,package=package.name)
    elif legacy:
        package=db.scalar(select(Package).where(func.lower(Package.name)==legacy.lower()))
        if package:
            if not package.active: raise HTTPException(status_code=422, detail="The selected package is inactive")
            values.update(package_id=package.id,package=package.name)
        else: values.update(package_id=None,package=legacy)
    else: values.update(package_id=None,package="Standard")
    return values
def invoice_values(data: InvoiceIn, db):
    get_or_404(db,Patient,data.patient_id); values=data.model_dump()
    if data.package_id is not None:
        package=get_or_404(db,Package,data.package_id)
        if not package.active: raise HTTPException(status_code=422, detail="The selected package is inactive")
        values.update(package_id=package.id,service=f"{package.name} package",amount=float(package.price))
    elif not data.service or not data.service.strip() or data.amount is None: raise HTTPException(status_code=422, detail="Manual invoices require both service and amount")
    else: values["service"]=data.service.strip()
    return values
