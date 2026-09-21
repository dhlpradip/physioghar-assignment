from datetime import date, datetime
from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .database import Base

class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(20), default="staff")
    active: Mapped[bool] = mapped_column(Boolean, default=True)

class Therapist(Base):
    __tablename__ = "therapists"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    specialty: Mapped[str] = mapped_column(String(150))
    working_days: Mapped[str] = mapped_column(String(80), default="0,1,2,3,4")
    start_time: Mapped[str] = mapped_column(String(5), default="09:00")
    end_time: Mapped[str] = mapped_column(String(5), default="17:00")
    slot_duration: Mapped[int] = mapped_column(Integer, default=60)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    patients = relationship("Patient", back_populates="therapist")

class ScheduleOverride(Base):
    __tablename__ = "schedule_overrides"
    id: Mapped[int] = mapped_column(primary_key=True)
    therapist_id: Mapped[int] = mapped_column(ForeignKey("therapists.id"), index=True)
    date: Mapped[date] = mapped_column(Date)
    is_off: Mapped[bool] = mapped_column(Boolean, default=False)
    start_time: Mapped[str | None] = mapped_column(String(5), nullable=True)
    end_time: Mapped[str | None] = mapped_column(String(5), nullable=True)
    __table_args__ = (UniqueConstraint("therapist_id", "date", name="uq_override_day"),)

class Patient(Base):
    __tablename__ = "patients"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), index=True)
    phone: Mapped[str] = mapped_column(String(30), index=True)
    age: Mapped[int] = mapped_column(Integer)
    gender: Mapped[str] = mapped_column(String(30))
    address: Mapped[str] = mapped_column(Text, default="")
    condition: Mapped[str] = mapped_column(String(200))
    therapist_id: Mapped[int | None] = mapped_column(ForeignKey("therapists.id"), nullable=True)
    package: Mapped[str] = mapped_column(String(100), default="Standard")
    status: Mapped[str] = mapped_column(String(20), default="Active")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    therapist = relationship("Therapist", back_populates="patients")

class Appointment(Base):
    __tablename__ = "appointments"
    id: Mapped[int] = mapped_column(primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id"), index=True)
    therapist_id: Mapped[int] = mapped_column(ForeignKey("therapists.id"), index=True)
    date: Mapped[date] = mapped_column(Date, index=True)
    time: Mapped[str] = mapped_column(String(5))
    payment_method: Mapped[str] = mapped_column(String(40), default="Cash")
    notes: Mapped[str] = mapped_column(Text, default="")
    session_type: Mapped[str] = mapped_column(String(100), default="Physiotherapy session")
    status: Mapped[str] = mapped_column(String(20), default="Booked")
    patient = relationship("Patient")
    therapist = relationship("Therapist")
    __table_args__ = (UniqueConstraint("therapist_id", "date", "time", name="uq_therapist_slot"),)

class Invoice(Base):
    __tablename__ = "invoices"
    id: Mapped[int] = mapped_column(primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id"), index=True)
    service: Mapped[str] = mapped_column(String(160))
    amount: Mapped[float] = mapped_column(Numeric(10, 2))
    discount: Mapped[float] = mapped_column(Numeric(10, 2), default=0)
    status: Mapped[str] = mapped_column(String(20), default="Due")
    payment_method: Mapped[str] = mapped_column(String(40), default="Cash")
    issued_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    patient = relationship("Patient")
