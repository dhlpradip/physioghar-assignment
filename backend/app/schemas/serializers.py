from ..models import Appointment, Invoice, Package, Patient, Therapist, User

def public_user(user: User):
    return {"id": user.id, "name": user.name, "email": user.email, "role": user.role}
def serialize_package(package: Package):
    return {"id": package.id, "name": package.name, "description": package.description, "session_count": package.session_count, "price": float(package.price), "active": package.active}
def serialize_patient(patient: Patient):
    package = patient.package_record
    package_name = package.name if package else patient.package
    return {"id": patient.id, "name": patient.name, "phone": patient.phone, "age": patient.age, "gender": patient.gender, "address": patient.address, "condition": patient.condition, "therapist_id": patient.therapist_id, "therapist_name": patient.therapist.name if patient.therapist else None, "package_id": patient.package_id, "package_name": package_name, "package": package_name, "status": patient.status, "created_at": patient.created_at}
def serialize_therapist(therapist: Therapist, seen=0):
    return {"id": therapist.id, "name": therapist.name, "specialty": therapist.specialty, "working_days": therapist.working_days, "start_time": therapist.start_time, "end_time": therapist.end_time, "slot_duration": therapist.slot_duration, "active": therapist.active, "patients_seen_today": seen}
def serialize_appointment(appointment: Appointment):
    patient, therapist = appointment.patient, appointment.therapist
    package = patient.package_record if patient else None
    return {"id": appointment.id, "patient_id": appointment.patient_id, "patient_name": patient.name if patient else None, "patient_package_id": patient.package_id if patient else None, "patient_package_name": package.name if package else (patient.package if patient else None), "therapist_id": appointment.therapist_id, "therapist_name": therapist.name if therapist else None, "date": appointment.date, "time": appointment.time, "payment_method": appointment.payment_method, "notes": appointment.notes, "session_type": appointment.session_type, "status": appointment.status}
def serialize_invoice(invoice: Invoice):
    patient, package = invoice.patient, invoice.package
    return {"id": invoice.id, "patient_id": invoice.patient_id, "patient_name": patient.name if patient else None, "package_id": invoice.package_id, "package_name": package.name if package else None, "service": invoice.service, "amount": float(invoice.amount), "discount": float(invoice.discount), "total": float(invoice.amount - invoice.discount), "status": invoice.status, "payment_method": invoice.payment_method, "issued_at": invoice.issued_at}
