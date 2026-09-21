# PhysioDesk

A clinic management take-home implementation using **FastAPI**, **Next.js**, and **PostgreSQL**. SQLAlchemy 2.0 is the ORM and Alembic owns the schema migration.

## Included

- Password-hashed JWT login with enforced `admin` and `staff` roles.
- Live dashboard statistics and therapist capacity, derived from appointment, therapist schedule, and invoice data.
- Patient CRUD API, search/filtering, and a detail API with session and billing history.
- Date-based therapist scheduling with availability checks and database-level double-booking prevention.
- Admin-only therapist and schedule-override management, and admin-only invoice CRUD.
- Next.js dashboard using the prescribed palette, Fraunces/Inter/IBM Plex Mono typography, sidebar, cards, status pills, tables, and modal forms.
- PostgreSQL seed data and an Alembic initial migration.

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

All endpoints except `/auth/login` and `/health` require a Bearer token. Staff members can use dashboard, patients, and schedule APIs/UI. Billing and therapist management are deliberately admin-only and are both hidden in the frontend and protected with backend `403` checks.

## Assumptions

- Working-day values use `0` through `6` for Monday through Sunday. Therapists are available in regular slot-duration increments between their configured start/end times.
- A therapist day override takes precedence over the weekly schedule. An `is_off` override removes every slot; a custom start/end override supplies a custom day.
- A patient with invoices or appointments is retained for clinical/audit history rather than deleted. Likewise, therapists with appointment history cannot be deleted; deactivate them instead. This prevents orphaned historical records.
- Appointment cancellation does not consume a slot. Invoice `Void` is retained rather than hard-deleted in ordinary UI usage, although the API supports deletion as requested.
- The creation modals keep the implementation intentionally compact: appointment and invoice forms accept IDs; the current schedule/list views make those IDs visible. A production version would use async searchable comboboxes and full edit/delete affordances in every view.

## With more time

I would add richer patient-profile and edit/delete UI controls, appointment detail/rescheduling modal flows, invoice printing, pagination, CSRF-aware httpOnly refresh-token authentication, test suites (API integration + frontend interaction), loading skeletons/toasts, and a full production Docker setup for API and web service.
