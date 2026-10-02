"""Run after `alembic upgrade head`: python -m app.seed"""
from datetime import date, datetime, timedelta
from .database import SessionLocal
from .core.security import pwd
from .models import Appointment, Invoice, Package, Patient, Therapist, User


PACKAGE_SEEDS = [
    {"name": "Standard", "description": "A flexible course of general physiotherapy sessions.", "session_count": 4, "price": 300},
    {"name": "Recovery Plus", "description": "Extended rehabilitation support for recovery and mobility.", "session_count": 8, "price": 560},
    {"name": "Athlete Care", "description": "Sports rehabilitation and return-to-activity programme.", "session_count": 6, "price": 450},
    {"name": "Wellness Maintenance", "description": "Ongoing preventive physiotherapy and mobility care.", "session_count": 3, "price": 210},
]


def ensure_packages(db):
    packages = {package.name: package for package in db.query(Package).all()}
    for values in PACKAGE_SEEDS:
        if values["name"] not in packages:
            package = Package(**values)
            db.add(package)
            packages[package.name] = package
    db.flush()
    return packages


def link_legacy_patient_packages(db, packages):
    for patient in db.query(Patient).filter(Patient.package_id.is_(None)).all():
        package = packages.get(patient.package)
        if package:
            patient.package_id = package.id
            patient.package = package.name


def main():
    db = SessionLocal()
    try:
        packages = ensure_packages(db)
        if db.query(User).first():
            link_legacy_patient_packages(db, packages)
            db.commit()
            print("Database already contains users; ensured packages and linked matching patient packages.")
            return

        admin = User(name="Alex Morgan", email="admin@physiodesk.test", password_hash=pwd.hash("Admin123!"), role="admin")
        staff = User(name="Jamie Lee", email="staff@physiodesk.test", password_hash=pwd.hash("Staff123!"), role="staff")
        therapists = [
            Therapist(name="Dr. Maya Patel", specialty="Sports Rehabilitation", working_days="0,1,2,3,4", start_time="09:00", end_time="17:00"),
            Therapist(name="Dr. Noah Chen", specialty="Manual Therapy", working_days="0,1,2,3,4", start_time="08:00", end_time="16:00"),
            Therapist(name="Dr. Sofia Reyes", specialty="Neurological Physiotherapy", working_days="1,2,3,4,5", start_time="10:00", end_time="18:00"),
            Therapist(name="Dr. Ethan Brooks", specialty="Post-operative Recovery", working_days="0,2,4", start_time="09:00", end_time="15:00"),
        ]
        db.add_all([admin, staff, *therapists])
        db.flush()
        details = [
            ("Olivia Martin", "555-0101", 32, "Female", "Lower back pain", 0, "Recovery Plus", "Active"),
            ("Liam Wilson", "555-0102", 45, "Male", "Shoulder impingement", 1, "Standard", "Active"),
            ("Emma Davis", "555-0103", 28, "Female", "ACL rehabilitation", 0, "Athlete Care", "Active"),
            ("Noah Thompson", "555-0104", 51, "Male", "Knee osteoarthritis", 3, "Recovery Plus", "On hold"),
            ("Ava Garcia", "555-0105", 38, "Female", "Neck pain", 1, "Standard", "Active"),
            ("William Brown", "555-0106", 60, "Male", "Post hip replacement", 3, "Recovery Plus", "Active"),
            ("Sophia Moore", "555-0107", 25, "Female", "Ankle sprain", 0, "Athlete Care", "Completed"),
            ("James Taylor", "555-0108", 42, "Male", "Sciatica", 1, "Standard", "Active"),
            ("Isabella Anderson", "555-0109", 35, "Female", "Stroke recovery", 2, "Recovery Plus", "Active"),
            ("Benjamin Thomas", "555-0110", 48, "Male", "Tennis elbow", None, "Standard", "Active"),
        ]
        patients = [
            Patient(name=name, phone=phone, age=age, gender=gender, address="18 Willow Street", condition=condition, therapist_id=therapists[therapist_index].id if therapist_index is not None else None, package=package_name, package_id=packages[package_name].id, status=status, created_at=datetime.utcnow() - timedelta(days=index))
            for index, (name, phone, age, gender, condition, therapist_index, package_name, status) in enumerate(details)
        ]
        db.add_all(patients)
        db.flush()
        today = date.today()
        appointments = [
            Appointment(patient_id=patients[0].id, therapist_id=therapists[0].id, date=today, time="09:00", payment_method="Card", notes="Initial assessment", status="Completed"),
            Appointment(patient_id=patients[1].id, therapist_id=therapists[1].id, date=today, time="08:00", payment_method="Cash", notes="Mobility work", status="Booked"),
            Appointment(patient_id=patients[2].id, therapist_id=therapists[0].id, date=today, time="10:00", payment_method="Card", notes="Strength progression", status="Booked"),
            Appointment(patient_id=patients[8].id, therapist_id=therapists[2].id, date=today + timedelta(days=1), time="10:00", payment_method="Insurance", notes="", status="Booked"),
            Appointment(patient_id=patients[6].id, therapist_id=therapists[0].id, date=today - timedelta(days=3), time="11:00", payment_method="Card", notes="Discharged", status="Completed"),
        ]
        invoices = [
            Invoice(patient_id=patients[0].id, service="Initial consultation", amount=95, discount=0, status="Paid", payment_method="Card", issued_at=datetime.combine(today, datetime.min.time())),
            Invoice(patient_id=patients[1].id, service="Manual therapy session", amount=80, discount=5, status="Due", payment_method="Cash"),
            Invoice(patient_id=patients[2].id, package_id=packages["Athlete Care"].id, service="Athlete Care package", amount=450, discount=45, status="Paid", payment_method="Card", issued_at=datetime.combine(today - timedelta(days=2), datetime.min.time())),
            Invoice(patient_id=patients[8].id, service="Neurological session", amount=110, discount=0, status="Due", payment_method="Insurance"),
        ]
        db.add_all([*appointments, *invoices])
        db.commit()
        print("Seeded admin, staff, 4 packages, 4 therapists, 10 patients, appointments, and invoices.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
