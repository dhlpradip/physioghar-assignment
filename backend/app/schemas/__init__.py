from datetime import date
from typing import Literal
from pydantic import BaseModel, Field

class Token(BaseModel):
    access_token: str
    token_type: str
    user: dict

class PatientFields(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    phone: str = Field(min_length=5, max_length=30)
    age: int = Field(ge=0, le=130)
    gender: str
    address: str = ""
    condition: str
    therapist_id: int | None = None
    package_id: int | None = None
    package: str | None = "Standard"
    status: Literal["Active", "Completed", "On hold"] = "Active"

class PatientIn(PatientFields):
    appointment_date: date | None = None
    appointment_time: str | None = None
    appointment_payment_method: str = "Cash"
    appointment_notes: str = ""
class PatientUpdate(PatientFields): pass
class TherapistIn(BaseModel):
    name: str
    specialty: str
    working_days: str = "0,1,2,3,4"
    start_time: str = "09:00"
    end_time: str = "17:00"
    slot_duration: int = Field(default=60, ge=15, le=180)
    active: bool = True
class PackageIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    description: str = ""
    session_count: int = Field(ge=1, le=500)
    price: float = Field(gt=0)
    active: bool = True
class AppointmentIn(BaseModel):
    patient_id: int
    therapist_id: int
    date: date
    time: str
    payment_method: str = "Cash"
    notes: str = ""
    session_type: str = "Physiotherapy session"
    status: Literal["Booked", "Completed", "Cancelled"] = "Booked"
class InvoiceIn(BaseModel):
    patient_id: int
    package_id: int | None = None
    service: str | None = None
    amount: float | None = Field(default=None, gt=0)
    discount: float = Field(default=0, ge=0)
    status: Literal["Paid", "Due", "Void"] = "Due"
    payment_method: str = "Cash"
class OverrideIn(BaseModel):
    date: date
    is_off: bool = False
    start_time: str | None = None
    end_time: str | None = None
