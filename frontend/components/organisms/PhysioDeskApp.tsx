'use client';

import { useState } from 'react';
import { EditRecordModal, EditTarget } from '../EditRecordModal';
import { DashboardView } from './views/DashboardView';
import { BillingView } from './views/BillingView';
import { ScheduleView } from './views/ScheduleView';
import { TherapistsView } from './views/TherapistsView';
import { PatientForm, AppointmentForm, InvoiceForm, TherapistForm } from './views/FormModals';
import { PatientsView } from './views/PatientsView';
import type { View } from '../../lib/types';
import { usePhysioDeskApp } from '../../lib/hooks/usePhysioDeskApp';
import { useBillingActions } from '../../lib/hooks/useBillingActions';

const nav: Exclude<View, 'Patient profile'>[] = [
  'Dashboard',
  'Patients',
  'Schedule',
  'Billing',
  'Therapists',
];
function statusClass(value: string) {
  return ['Paid', 'Active', 'Booked', 'Completed'].includes(value)
    ? 'success'
    : ['Due', 'Void', 'Cancelled'].includes(value)
      ? 'danger'
      : 'neutral';
}

export function PhysioDeskApp({
  initialView = 'Dashboard',
  patientId,
}: {
  initialView?: View;
  patientId?: number;
}) {
  const {
    token,
    user,
    view,
    modal,
    editing,
    bookingPatientId,
    search,
    patientStatus,
    patientTherapist,
    scheduleDate,
    data,
    catalog,
    loading,
    error,
    setSearch,
    setPatientStatus,
    setPatientTherapist,
    setScheduleDate,
    setEditing,
    setModal,
    handleLogin,
    changeView,
    openBooking,
    openPatientProfile,
    closeModal,
    completed,
    logout,
    load,
  } = usePhysioDeskApp(initialView, patientId);

  if (!user)
    return (
      <main className="login">
        <section className="login-card">
          <p className="eyebrow">Clinic management</p>
          <h1>
            Physio<span>Desk</span>
          </h1>
          <p>Sign in to manage your clinic with clarity.</p>
          <form onSubmit={handleLogin}>
            <FormField
              label="Email"
              name="email"
              type="email"
              defaultValue="admin@physiodesk.test"
            />
            <FormField label="Password" name="password" type="password" defaultValue="Admin123!" />
            {error && <p className="error">{error}</p>}
            <button className="button full">Sign in</button>
          </form>
          <div className="login-note">
            <b>Demo access</b>
            <br />
            Admin: admin@physiodesk.test / Admin123!
            <br />
            Staff: staff@physiodesk.test / Staff123!
          </div>
        </section>
      </main>
    );

  const restricted = (view === 'Billing' || view === 'Therapists') && user.role !== 'admin';
  const action: [string, () => void] | null =
    view === 'Patients'
      ? ['+ Add patient', () => setModal('patient')]
      : view === 'Schedule'
        ? ['+ Book appointment', () => openBooking()]
        : view === 'Billing'
          ? ['+ Add billing', () => setModal('invoice')]
          : view === 'Therapists'
            ? ['+ Add therapist', () => setModal('therapist')]
            : null;

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          Physio<span>Desk</span>
        </div>
        <nav className="nav">
          {nav
            .filter(
              (item) =>
                user.role === 'admin' || !(['Billing', 'Therapists'] as View[]).includes(item),
            )
            .map((item) => (
              <button
                key={item}
                className={view === item ? 'active' : ''}
                onClick={() => changeView(item)}
              >
                {item}
              </button>
            ))}
        </nav>
        <div className="sidebar-footer">
          {user.name}
          <br />
          <span>{user.role}</span>
          <br />
          <button onClick={logout}>Sign out</button>
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <div>
            {view === 'Patient profile' && (
              <button className="back-link" onClick={() => changeView('Patients')}>
                ← All patients
              </button>
            )}
            <p className="eyebrow">
              {user.role === 'admin' ? 'Clinic administration' : 'Reception workspace'}
            </p>
            <h1 className="title">{view}</h1>
          </div>
          {!restricted && action && (
            <button className="button" onClick={action[1] as () => void}>
              {action[0]}
            </button>
          )}
        </header>
        {error && <p className="error alert">{error}</p>}
        {loading ? (
          <p className="muted">Loading live clinic data…</p>
        ) : restricted ? (
          <section className="card">
            Billing and therapist management are available to administrators only.
          </section>
        ) : (
          <Content
            view={view}
            data={data}
            search={search}
            setSearch={setSearch}
            patientStatus={patientStatus}
            setPatientStatus={setPatientStatus}
            patientTherapist={patientTherapist}
            setPatientTherapist={setPatientTherapist}
            scheduleDate={scheduleDate}
            setScheduleDate={setScheduleDate}
            reload={load}
            openBooking={openBooking}
            openProfile={openPatientProfile}
            openEdit={(target: EditTarget) => setEditing(target)}
            token={token}
          />
        )}
      </main>
      {modal === 'patient' && (
        <PatientForm
          token={token}
          packages={catalog.packages}
          therapists={catalog.therapists}
          onClose={closeModal}
          onSuccess={completed}
        />
      )}
      {modal === 'appointment' && (
        <AppointmentForm
          token={token}
          patients={catalog.appointmentPatients}
          defaultPatientId={bookingPatientId}
          onClose={closeModal}
          onSuccess={completed}
        />
      )}
      {modal === 'invoice' && (
        <InvoiceForm
          token={token}
          patients={catalog.patients}
          packages={catalog.packages}
          onClose={closeModal}
          onSuccess={completed}
        />
      )}
      {modal === 'therapist' && (
        <TherapistForm token={token} onClose={closeModal} onSuccess={completed} />
      )}
      {editing && (
        <EditRecordModal
          target={editing}
          token={token}
          packages={catalog.packages}
          therapists={catalog.therapists}
          onClose={() => setEditing(null)}
          onSuccess={completed}
        />
      )}
    </div>
  );
}

function Content({
  view,
  data,
  search,
  setSearch,
  patientStatus,
  setPatientStatus,
  patientTherapist,
  setPatientTherapist,
  scheduleDate,
  setScheduleDate,
  reload,
  openBooking,
  openProfile,
  openEdit,
  token,
}: any) {
  if (!data) return null;
  if (view === 'Dashboard')
    return (
      <DashboardView
        data={data}
        reload={reload}
        recent={
          <section className="card section-card">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Latest registrations</p>
                <h2>Recent patients</h2>
              </div>
            </div>
            <PatientsView
              items={data.recent_patients}
              token={token}
              openBooking={openBooking}
              openProfile={openProfile}
              openEdit={openEdit}
            />
          </section>
        }
      />
    );
  if (view === 'Patients') {
    const filtered = data.filter(
      (p: any) =>
        (patientStatus === 'All' || p.status === patientStatus) &&
        (patientTherapist === 'All' ||
          (patientTherapist === 'Unassigned'
            ? !p.therapist_id
            : String(p.therapist_id) === patientTherapist)),
    );
    return (
      <section className="card">
        <div className="toolbar">
          <input
            className="input"
            placeholder="Search by patient name or phone…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select
            className="input"
            value={patientStatus}
            onChange={(e) => setPatientStatus(e.target.value)}
          >
            <option>All</option>
            <option>Active</option>
            <option>Completed</option>
            <option>On hold</option>
          </select>
          <select
            className="input"
            value={patientTherapist}
            onChange={(e) => setPatientTherapist(e.target.value)}
          >
            <option value="All">All therapists</option>
            <option value="Unassigned">Unassigned</option>
            {Array.from(
              new Map(
                data
                  .filter((p: any) => p.therapist_id)
                  .map((p: any) => [p.therapist_id, p.therapist_name]),
              ),
            ).map(([id, name]) => (
              <option key={String(id)} value={String(id)}>
                {String(name)}
              </option>
            ))}
          </select>
        </div>
        <PatientsView
          items={filtered}
          token={token}
          openBooking={openBooking}
          openProfile={openProfile}
          openEdit={openEdit}
        />
      </section>
    );
  }
  if (view === 'Patient profile') return <PatientProfile detail={data} onEdit={openEdit} />;
  if (view === 'Billing')
    return <BillingView data={data} token={token} openEdit={openEdit} statusClass={statusClass} />;
  if (view === 'Therapists') return <TherapistsView data={data} openEdit={openEdit} />;
  return (
    <ScheduleView
      data={data}
      scheduleDate={scheduleDate}
      setScheduleDate={setScheduleDate}
      openEdit={openEdit}
    />
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <section className="card">
      <span className="stat-label">{label}</span>
      <p className="stat-value mono">{value}</p>
    </section>
  );
}
function BillingTable({ data, token, openEdit }: any) {
  const [status, setStatus] = useState('All');
  const { removeInvoice } = useBillingActions(token);
  const rows = data.filter((i: any) => status === 'All' || i.status === status);
  return (
    <section className="card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Invoice register</p>
          <h2>Billing history</h2>
        </div>
        <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option>All</option>
          <option>Due</option>
          <option>Paid</option>
          <option>Void</option>
        </select>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Patient</th>
              <th>Package / service</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Issued</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((invoice: any) => (
              <tr key={invoice.id}>
                <td className="mono">INV-{String(invoice.id).padStart(4, '0')}</td>
                <td>{invoice.patient_name}</td>
                <td>{invoice.package_name || invoice.service}</td>
                <td className="mono">${invoice.total.toFixed(2)}</td>
                <td>
                  <span className={`pill ${statusClass(invoice.status)}`}>{invoice.status}</span>
                </td>
                <td>{new Date(invoice.issued_at).toLocaleDateString()}</td>
                <td>
                  <button
                    className="assign-button"
                    onClick={() => openEdit({ kind: 'invoice', record: invoice })}
                  >
                    Edit
                  </button>
                  <button className="assign-button" onClick={() => removeInvoice(invoice.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
function Schedule({ data, scheduleDate, setScheduleDate, openEdit }: any) {
  const times = Array.from(
    new Set<string>(
      data.therapists.flatMap((therapist: any) => therapist.slots.map((slot: any) => slot.time)),
    ),
  ).sort();
  return (
    <section className="card">
      <div className="toolbar">
        <label className="date-control">
          Schedule date{' '}
          <input
            className="input"
            type="date"
            value={scheduleDate}
            onChange={(event) => setScheduleDate(event.target.value)}
          />
        </label>
      </div>
      <div className="schedule">
        <div className="head">Time</div>
        {data.therapists.map((therapist: any) => (
          <div className="head" key={therapist.therapist.id}>
            {therapist.therapist.name.replace('Dr. ', '')}
          </div>
        ))}
        {times.flatMap((time) => [
          <div key={`${time}-time`} className="mono time-cell">
            {time}
          </div>,
          ...data.therapists.map((therapist: any) => {
            const slot = therapist.slots.find((entry: any) => entry.time === time);
            return (
              <button
                key={`${time}-${therapist.therapist.id}`}
                className={slot?.appointment ? 'slot slot-button' : 'slot open'}
                onClick={() =>
                  slot?.appointment && openEdit({ kind: 'appointment', record: slot.appointment })
                }
                disabled={!slot?.appointment}
              >
                {slot?.appointment ? (
                  <>
                    <b>{slot.appointment.patient_name}</b>
                    <br />
                    <span>Click to reschedule</span>
                  </>
                ) : slot ? (
                  'Open'
                ) : therapist.off ? (
                  'Off'
                ) : (
                  '—'
                )}
              </button>
            );
          }),
        ])}
      </div>
    </section>
  );
}
function PatientProfile({ detail, onEdit }: { detail: any; onEdit: (target: EditTarget) => void }) {
  const patient = detail.patient;
  return (
    <>
      <section className="profile-hero">
        <div>
          <p className="eyebrow">Patient profile</p>
          <h2>{patient.name}</h2>
          <p>
            {patient.condition} · {patient.package_name || patient.package}
          </p>
        </div>
        <div className="profile-actions">
          <span className={`pill ${statusClass(patient.status)}`}>{patient.status}</span>
          <button
            className="button secondary"
            onClick={() => onEdit({ kind: 'patient', record: patient })}
          >
            Edit patient
          </button>
        </div>
      </section>
      <div className="profile-grid">
        <section className="card">
          <h2>Overview</h2>
          <dl className="details">
            <div>
              <dt>Phone</dt>
              <dd>{patient.phone}</dd>
            </div>
            <div>
              <dt>Age / gender</dt>
              <dd>
                {patient.age} · {patient.gender}
              </dd>
            </div>
            <div>
              <dt>Assigned therapist</dt>
              <dd>{patient.therapist_name || 'Unassigned'}</dd>
            </div>
            <div>
              <dt>Address</dt>
              <dd>{patient.address || 'Not recorded'}</dd>
            </div>
          </dl>
        </section>
        <section className="card">
          <h2>Package</h2>
          <p className="package-name">{patient.package_name || patient.package}</p>
          <p className="muted">Current care plan for {patient.condition}.</p>
        </section>
      </div>
      <section className="card section-card">
        <h2>Session history</h2>
        <SessionTable items={detail.sessions} />
      </section>
      <section className="card section-card">
        <h2>Billing history</h2>
        <InvoiceTable items={detail.invoices} />
      </section>
    </>
  );
}
function SessionTable({ items }: { items: any[] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Therapist</th>
            <th>Type</th>
            <th>Notes</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {items.length ? (
            items.map((item) => (
              <tr key={item.id}>
                <td>
                  {item.date} <span className="mono">{item.time}</span>
                </td>
                <td>{item.therapist_name}</td>
                <td>{item.session_type}</td>
                <td>{item.notes || '—'}</td>
                <td>
                  <span className={`pill ${statusClass(item.status)}`}>{item.status}</span>
                </td>
              </tr>
            ))
          ) : (
            <EmptyRow columns={5} text="No sessions recorded yet." />
          )}
        </tbody>
      </table>
    </div>
  );
}
function InvoiceTable({ items }: { items: any[] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Invoice</th>
            <th>Service</th>
            <th>Amount</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {items.length ? (
            items.map((item) => (
              <tr key={item.id}>
                <td className="mono">INV-{String(item.id).padStart(4, '0')}</td>
                <td>{item.package_name || item.service}</td>
                <td className="mono">${item.total.toFixed(2)}</td>
                <td>
                  <span className={`pill ${statusClass(item.status)}`}>{item.status}</span>
                </td>
              </tr>
            ))
          ) : (
            <EmptyRow columns={4} text="No invoices recorded yet." />
          )}
        </tbody>
      </table>
    </div>
  );
}
function EmptyRow({ columns, text }: { columns: number; text: string }) {
  return (
    <tr>
      <td className="muted" colSpan={columns}>
        {text}
      </td>
    </tr>
  );
}

function FormField({
  label,
  name,
  type = 'text',
  defaultValue,
  value,
  onChange,
  wide = false,
  required = true,
  help,
}: any) {
  return (
    <label className={wide ? 'wide' : ''}>
      <span>{label}</span>
      <input
        className="input"
        name={name}
        type={type}
        defaultValue={defaultValue}
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        required={required}
      />
      {help && <small>{help}</small>}
    </label>
  );
}
function SelectField({ label, name, options, placeholder, value, onChange }: any) {
  return (
    <label>
      <span>{label}</span>
      <select
        className="input"
        name={name}
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        required
      >
        <option value="">{placeholder || 'Select an option'}</option>
        {options.map((option: any) => {
          const item = typeof option === 'string' ? { value: option, label: option } : option;
          return (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          );
        })}
      </select>
    </label>
  );
}
function FormActions({ onClose, saving, label }: any) {
  return (
    <div className="form-actions wide">
      <button className="button secondary" type="button" onClick={onClose}>
        Cancel
      </button>
      <button className="button" disabled={saving}>
        {saving ? 'Saving…' : label}
      </button>
    </div>
  );
}
