# PhysioDesk

A clinic management take-home implementation using **FastAPI**, **Next.js**, and **PostgreSQL**. SQLAlchemy 2.0 is the ORM and Alembic owns the schema migration.

## Included

- Password-hashed JWT login with enforced `admin` and `staff` roles.
- Live dashboard statistics and therapist capacity, derived from appointment, therapist schedule, and invoice data.
- Patient CRUD API, search/filtering, and a profile view/API with overview, session history, and billing history.
- A first-class package catalogue with session counts and prices; package invoices use the catalogue price automatically.
- Date-based therapist scheduling with availability checks and database-level double-booking prevention.
- Active-patient, package, and available-therapist dropdowns for appointment and invoice creation. An unassigned patient is assigned automatically when booked.
- Admin-only therapist, package, schedule-override, and invoice CRUD.
- Next.js dashboard using the prescribed palette, Fraunces/Inter/IBM Plex Mono typography, sidebar, cards, status pills, tables, profile views, and modal forms.
- PostgreSQL seed data and Alembic migrations.

## Quick start

### 1. Start PostgreSQL

```sh
cd physioghar-assignment
docker compose up -d db
```

Or create a PostgreSQL database yourself and set `DATABASE_URL` in `backend/.env` (copy `backend/.env.example`).

### 2. Start the API

```sh
cd backend
python -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
alembic upgrade head
python -m app.seed
uvicorn app.main:app --reload
```

The interactive OpenAPI documentation is available at <http://localhost:8000/docs>.

### 3. Start the frontend

```sh
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```

Open <http://localhost:3000>.

## Demo accounts

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@physiodesk.test` | `Admin123!` |
| Staff | `staff@physiodesk.test` | `Staff123!` |

## Authorization

All endpoints except `/auth/login` require a Bearer token. Staff members can use dashboard, patients, and schedule APIs/UI. Billing and therapist management are deliberately admin-only and are both hidden in the frontend and protected with backend `403` checks.

## Assumptions

- Working-day values use `0` through `6` for Monday through Sunday. Therapists are available in regular slot-duration increments between their configured start/end times.
- A therapist day override takes precedence over the weekly schedule. An `is_off` override removes every slot; a custom start/end override supplies a custom day.
- A patient with invoices or appointments is retained for clinical/audit history rather than deleted. Likewise, therapists with appointment history cannot be deleted; deactivate them instead. This prevents orphaned historical records.
- Appointment cancellation does not consume a slot. Invoice `Void` is retained rather than hard-deleted in ordinary UI usage, although the API supports deletion as requested.
- Packages are clinic-wide catalogue records. They are retained for historical records and should be deactivated rather than deleted once assigned to a patient or invoice.
- Appointment, invoice, and new-patient forms use selected records rather than raw IDs. Patient, invoice, therapist, and appointment management includes edit/delete or deactivation flows with confirmation where destructive.
