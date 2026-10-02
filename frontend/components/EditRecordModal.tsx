'use client';

import { FormEvent, useEffect, useState } from 'react';
import { listAvailableTherapists } from '../lib/api/therapists';
import { useEditRecord } from '../lib/hooks/useEditRecord';
import { DayMultiSelect } from './molecules/DayMultiSelect';

export type EditTarget = { kind: 'patient' | 'invoice' | 'therapist' | 'appointment'; record: any };
type Props = {
  target: EditTarget;
  token: string;
  packages: any[];
  therapists: any[];
  onClose: () => void;
  onSuccess: () => Promise<void>;
};

function Shell({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="modal-bg" onMouseDown={onClose}>
      <section className="modal" onMouseDown={(event) => event.stopPropagation()}>
        <button className="modal-close" onClick={onClose} type="button">
          ×
        </button>
        <p className="eyebrow">Edit record</p>
        <h2>{title}</h2>
        {children}
      </section>
    </div>
  );
}
function Field({ label, name, value, type = 'text', required = true }: any) {
  return (
    <label>
      <span>{label}</span>
      <input
        className="input"
        name={name}
        type={type}
        defaultValue={value ?? ''}
        required={required}
      />
    </label>
  );
}
function Select({ label, name, value, options }: any) {
  return (
    <label>
      <span>{label}</span>
      <select className="input" name={name} defaultValue={String(value ?? '')} required>
        {options.map((option: any) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
function Actions({ saving, onClose, label }: any) {
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

export function EditRecordModal({
  target,
  token,
  packages,
  therapists,
  onClose,
  onSuccess,
}: Props) {
  const record = target.record;
  const { saving, error, setError, save } = useEditRecord(token, target, onSuccess);
  if (target.kind === 'patient')
    return (
      <Shell title={`Edit ${record.name}`} onClose={onClose}>
        <p className="modal-subtitle">
          Update the patient’s profile, assigned therapist, care package, or status.
        </p>
        <form
          className="form-grid"
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            const values: any = Object.fromEntries(formData);
            values.age = Number(values.age);
            values.therapist_id = values.therapist_id ? Number(values.therapist_id) : null;
            values.package_id = values.package_id ? Number(values.package_id) : null;
            save(values);
          }}
        >
          <Field label="Full name" name="name" value={record.name} />
          <Field label="Phone" name="phone" value={record.phone} />
          <Field label="Age" name="age" type="number" value={record.age} />
          <Select
            label="Gender"
            name="gender"
            value={record.gender}
            options={['Female', 'Male', 'Non-binary', 'Prefer not to say'].map((value) => ({
              value,
              label: value,
            }))}
          />
          <Field label="Condition" name="condition" value={record.condition} />
          <Select
            label="Assigned therapist"
            name="therapist_id"
            value={record.therapist_id || ''}
            options={[
              { value: '', label: 'Unassigned' },
              ...therapists.map((item) => ({ value: item.id, label: item.name })),
            ]}
          />
          <Select
            label="Care package"
            name="package_id"
            value={record.package_id || ''}
            options={[
              { value: '', label: 'No linked package' },
              ...packages.map((item) => ({
                value: item.id,
                label: `${item.name} · $${item.price}`,
              })),
            ]}
          />
          <Select
            label="Status"
            name="status"
            value={record.status}
            options={['Active', 'Completed', 'On hold'].map((value) => ({ value, label: value }))}
          />
          <label className="wide">
            <span>Address</span>
            <input className="input" name="address" defaultValue={record.address || ''} />
          </label>
          {error && <p className="error wide">{error}</p>}
          <Actions saving={saving} onClose={onClose} label="Save patient" />
        </form>
      </Shell>
    );
  if (target.kind === 'invoice')
    return (
      <Shell title={`Edit invoice INV-${String(record.id).padStart(4, '0')}`} onClose={onClose}>
        <p className="modal-subtitle">
          Update the invoice package, payment status, discount, or payment method.
        </p>
        <form
          className="form-grid"
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            const values: any = Object.fromEntries(new FormData(event.currentTarget));
            values.patient_id = Number(record.patient_id);
            values.package_id = values.package_id ? Number(values.package_id) : null;
            values.discount = Number(values.discount || 0);
            values.amount = Number(values.amount);
            save(values);
          }}
        >
          <Field label="Patient" name="patient_name" value={record.patient_name} required={false} />
          <Select
            label="Package"
            name="package_id"
            value={record.package_id || ''}
            options={[
              { value: '', label: 'Manual service' },
              ...packages.map((item) => ({
                value: item.id,
                label: `${item.name} · $${item.price}`,
              })),
            ]}
          />
          <Field label="Service" name="service" value={record.service} />
          <Field label="Amount" name="amount" type="number" value={record.amount} />
          <Field label="Discount" name="discount" type="number" value={record.discount} />
          <Select
            label="Status"
            name="status"
            value={record.status}
            options={['Due', 'Paid', 'Void'].map((value) => ({ value, label: value }))}
          />
          <Select
            label="Payment method"
            name="payment_method"
            value={record.payment_method}
            options={['Cash', 'Card', 'Insurance'].map((value) => ({ value, label: value }))}
          />
          {error && <p className="error wide">{error}</p>}
          <Actions saving={saving} onClose={onClose} label="Save invoice" />
        </form>
      </Shell>
    );
  if (target.kind === 'therapist')
    return (
      <Shell title={`Edit ${record.name}`} onClose={onClose}>
        <p className="modal-subtitle">
          Update weekly hours, deactivate the therapist, or add a date-specific schedule override.
        </p>
        <form
          className="form-grid"
          onSubmit={async (event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            const values: any = Object.fromEntries(formData);
            values.working_days = formData.getAll('working_days').join(',');
            if (!values.working_days) {
              setError('Select at least one working day.');
              return;
            }
            values.slot_duration = Number(values.slot_duration);
            values.active = values.active === 'true';
            await save(
              values,
              values.override_date
                ? {
                    date: values.override_date,
                    start_time: values.override_start || null,
                    end_time: values.override_end || null,
                    is_off: values.override_off === 'on',
                  }
                : undefined,
            );
          }}
        >
          <Field label="Full name" name="name" value={record.name} />
          <Field label="Specialty" name="specialty" value={record.specialty} />
          <DayMultiSelect name="working_days" value={record.working_days} />
          <Field
            label="Slot duration (minutes)"
            name="slot_duration"
            type="number"
            value={record.slot_duration}
          />
          <Field label="Start time" name="start_time" value={record.start_time} />
          <Field label="End time" name="end_time" value={record.end_time} />
          <Select
            label="Status"
            name="active"
            value={String(record.active)}
            options={[
              { value: 'true', label: 'Active' },
              { value: 'false', label: 'Inactive' },
            ]}
          />
          <Field label="Override date" name="override_date" type="date" required={false} />
          <Field label="Override start" name="override_start" required={false} />
          <Field label="Override end" name="override_end" required={false} />
          <label className="booking-toggle wide">
            <input type="checkbox" name="override_off" />{' '}
            <span>
              <b>Mark override date off</b>
              <small>Close this therapist on the selected date.</small>
            </span>
          </label>
          {error && <p className="error wide">{error}</p>}
          <Actions saving={saving} onClose={onClose} label="Save therapist" />
        </form>
      </Shell>
    );
  return (
    <AppointmentEditor record={record} token={token} onClose={onClose} onSuccess={onSuccess} />
  );
}

function AppointmentEditor({
  record,
  token,
  onClose,
  onSuccess,
}: {
  record: any;
  token: string;
  onClose: () => void;
  onSuccess: () => Promise<void>;
}) {
  const [date, setDate] = useState(record.date);
  const [time, setTime] = useState(record.time);
  const [available, setAvailable] = useState<any[]>([]);
  const { saving, error, setError, save } = useEditRecord(
    token,
    { kind: 'appointment', record },
    onSuccess,
  );
  useEffect(() => {
    listAvailableTherapists(token, date, time)
      .then((items: any[]) => {
        const current = { id: record.therapist_id, name: record.therapist_name };
        setAvailable(items.some((item) => item.id === current.id) ? items : [current, ...items]);
      })
      .catch((reason) => setError(reason.message));
  }, [date, time, token, record.therapist_id, record.therapist_name, setError]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values: any = Object.fromEntries(new FormData(event.currentTarget));
    values.patient_id = record.patient_id;
    values.therapist_id = Number(values.therapist_id);
    values.date = date;
    values.time = time;
    await save(values);
  }
  return (
    <Shell title={`Reschedule ${record.patient_name}`} onClose={onClose}>
      <p className="modal-subtitle">
        Choose a new date, time, and available therapist. The existing booking is retained until
        this update succeeds.
      </p>
      <form className="form-grid" onSubmit={submit}>
        <Field label="Patient" name="patient_name" value={record.patient_name} required={false} />
        <label>
          <span>Date</span>
          <input
            className="input"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </label>
        <label>
          <span>Time</span>
          <input className="input" value={time} onChange={(event) => setTime(event.target.value)} />
        </label>
        <Select
          label="Available therapist"
          name="therapist_id"
          value={record.therapist_id}
          options={available.map((item) => ({ value: item.id, label: item.name }))}
        />
        <Select
          label="Payment method"
          name="payment_method"
          value={record.payment_method}
          options={['Cash', 'Card', 'Insurance'].map((value) => ({ value, label: value }))}
        />
        <Field label="Session type" name="session_type" value={record.session_type} />
        <label className="wide">
          <span>Notes</span>
          <input className="input" name="notes" defaultValue={record.notes || ''} />
        </label>
        <Select
          label="Status"
          name="status"
          value={record.status}
          options={['Booked', 'Completed', 'Cancelled'].map((value) => ({ value, label: value }))}
        />
        {error && <p className="error wide">{error}</p>}
        <Actions saving={saving} onClose={onClose} label="Save appointment" />
      </form>
    </Shell>
  );
}
