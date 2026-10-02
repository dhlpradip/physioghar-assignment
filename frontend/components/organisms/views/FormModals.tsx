'use client';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { listAvailableTherapists } from '../../../lib/api/therapists';
import { useClinicForms } from '../../../lib/hooks/useClinicForms';
import { DayMultiSelect } from '../../molecules/DayMultiSelect';
const today = () => new Date().toISOString().slice(0, 10);
function Modal({
  title,
  subtitle,
  children,
  onClose,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="modal-bg" onMouseDown={onClose}>
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="modal-close" type="button" onClick={onClose}>
          ×
        </button>
        <p className="eyebrow">PhysioDesk</p>
        <h2>{title}</h2>
        <p className="modal-subtitle">{subtitle}</p>
        {children}
      </section>
    </div>
  );
}
export function PatientForm({ token, packages, therapists, onClose, onSuccess }: any) {
  const [bookNow, setBookNow] = useState(false);
  const [date, setDate] = useState(today());
  const [time, setTime] = useState('09:00');
  const [available, setAvailable] = useState<any[]>([]);
  const { saving, formError, setFormError, createPatient } = useClinicForms(token, onSuccess);
  useEffect(() => {
    if (!bookNow) return;
    listAvailableTherapists(token, date, time)
      .then(setAvailable)
      .catch((reason) => setFormError(reason.message));
  }, [bookNow, date, time, token, setFormError]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError('');
    const values: any = Object.fromEntries(new FormData(event.currentTarget));
    ['age', 'package_id', 'therapist_id'].forEach((key) => {
      if (values[key]) values[key] = Number(values[key]);
      else delete values[key];
    });
    if (bookNow) Object.assign(values, { appointment_date: date, appointment_time: time });
    try {
      await createPatient(values);
    } catch (reason: any) {
      setFormError(reason.message);
    }
  }
  return (
    <Modal
      title="Add patient"
      subtitle="Create a patient record and optionally reserve their first session."
      onClose={onClose}
    >
      <form onSubmit={submit} className="form-grid">
        <FormField label="Full name" name="name" />
        <FormField label="Phone" name="phone" />
        <FormField label="Age" name="age" type="number" />
        <SelectField
          label="Gender"
          name="gender"
          options={['Female', 'Male', 'Non-binary', 'Prefer not to say']}
        />
        <FormField label="Condition" name="condition" />
        <SelectField
          label="Care package"
          name="package_id"
          options={packages.map((item: any) => ({
            value: item.id,
            label: `${item.name} · $${item.price}`,
          }))}
          placeholder="Select a package"
        />
        <SelectField label="Status" name="status" options={['Active', 'Completed', 'On hold']} />
        <FormField label="Address" name="address" wide required={false} />
        <label className="booking-toggle wide">
          <input
            type="checkbox"
            checked={bookNow}
            onChange={(event) => setBookNow(event.target.checked)}
          />{' '}
          <span>
            <b>Book the first appointment</b>
            <small>Assign a therapist and reserve an available slot now.</small>
          </span>
        </label>
        {bookNow && (
          <>
            <FormField
              label="Appointment date"
              name="appointment_date_display"
              type="date"
              value={date}
              onChange={setDate}
            />
            <FormField
              label="Appointment time"
              name="appointment_time_display"
              value={time}
              onChange={setTime}
            />
            <SelectField
              label="Available therapist"
              name="therapist_id"
              options={available.map((item) => ({
                value: item.id,
                label: `${item.name} · ${item.specialty}`,
              }))}
              placeholder={
                available.length ? 'Choose an available therapist' : 'No therapists available'
              }
            />
            <SelectField
              label="Payment method"
              name="appointment_payment_method"
              options={['Cash', 'Card', 'Insurance']}
            />
            <FormField label="Appointment notes" name="appointment_notes" wide required={false} />
          </>
        )}
        {formError && <p className="error wide">{formError}</p>}
        <FormActions onClose={onClose} saving={saving} label="Create patient" />
      </form>
    </Modal>
  );
}
export function AppointmentForm({ token, patients, defaultPatientId, onClose, onSuccess }: any) {
  const [patientId, setPatientId] = useState(defaultPatientId ? String(defaultPatientId) : '');
  const [date, setDate] = useState(today());
  const [time, setTime] = useState('09:00');
  const [therapists, setTherapists] = useState<any[]>([]);
  const { saving, formError, setFormError, createAppointment } = useClinicForms(token, onSuccess);
  useEffect(() => {
    listAvailableTherapists(token, date, time)
      .then(setTherapists)
      .catch((reason) => setFormError(reason.message));
  }, [date, time, token, setFormError]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values: any = Object.fromEntries(new FormData(event.currentTarget));
    values.patient_id = Number(patientId);
    values.therapist_id = Number(values.therapist_id);
    values.date = date;
    values.time = time;
    setFormError('');
    try {
      await createAppointment(values);
    } catch (reason: any) {
      setFormError(reason.message);
    }
  }
  return (
    <Modal
      title="Book appointment"
      subtitle="Select an active patient and an open therapist slot. Unassigned patients are assigned automatically."
      onClose={onClose}
    >
      <form onSubmit={submit} className="form-grid">
        <SelectField
          label="Patient"
          name="patient_id_display"
          value={patientId}
          onChange={setPatientId}
          options={patients.map((item: any) => ({
            value: item.id,
            label: `${item.name}${item.therapist_name ? ` · ${item.therapist_name}` : ' · Unassigned'}`,
          }))}
          placeholder="Select an active patient"
        />
        <FormField label="Date" name="date_display" type="date" value={date} onChange={setDate} />
        <FormField
          label="Time"
          name="time_display"
          value={time}
          onChange={setTime}
          help="Use a slot time, e.g. 09:00"
        />
        <SelectField
          label="Available therapist"
          name="therapist_id"
          options={therapists.map((item) => ({
            value: item.id,
            label: `${item.name} · ${item.specialty}`,
          }))}
          placeholder={
            therapists.length ? 'Select an available therapist' : 'No therapists available'
          }
        />
        <SelectField
          label="Payment method"
          name="payment_method"
          options={['Cash', 'Card', 'Insurance']}
        />
        <FormField label="Session type" name="session_type" defaultValue="Physiotherapy session" />
        <FormField label="Notes" name="notes" wide required={false} />
        {formError && <p className="error wide">{formError}</p>}
        <FormActions onClose={onClose} saving={saving} label="Book appointment" />
      </form>
    </Modal>
  );
}
export function InvoiceForm({ token, patients, packages, onClose, onSuccess }: any) {
  const [packageId, setPackageId] = useState('');
  const { saving, formError, setFormError, createInvoice } = useClinicForms(token, onSuccess);
  const selected = useMemo(
    () => packages.find((item: any) => String(item.id) === packageId),
    [packages, packageId],
  );
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values: any = Object.fromEntries(new FormData(event.currentTarget));
    values.patient_id = Number(values.patient_id);
    values.package_id = packageId ? Number(packageId) : undefined;
    values.discount = Number(values.discount || 0);
    if (!packageId) values.amount = Number(values.amount);
    setFormError('');
    try {
      await createInvoice(values);
    } catch (reason: any) {
      setFormError(reason.message);
    }
  }
  return (
    <Modal
      title="Create invoice"
      subtitle="Choose a patient and package to automatically use the package price."
      onClose={onClose}
    >
      <form onSubmit={submit} className="form-grid">
        <SelectField
          label="Patient"
          name="patient_id"
          options={patients.map((item: any) => ({ value: item.id, label: item.name }))}
          placeholder="Select a patient"
        />
        <SelectField
          label="Package"
          name="package_id_display"
          value={packageId}
          onChange={setPackageId}
          options={packages.map((item: any) => ({
            value: item.id,
            label: `${item.name} · $${item.price}`,
          }))}
          placeholder="Manual service instead"
        />
        <div className="price-preview">
          {selected ? (
            <>
              <span>Package price</span>
              <b className="mono">${selected.price.toFixed(2)}</b>
            </>
          ) : (
            <>
              <span>Manual invoice</span>
              <b>Enter a service and amount</b>
            </>
          )}
        </div>
        {!packageId && (
          <>
            <FormField label="Service" name="service" />
            <FormField label="Amount" name="amount" type="number" />
          </>
        )}
        <FormField label="Discount" name="discount" type="number" defaultValue="0" />
        <SelectField label="Status" name="status" options={['Due', 'Paid']} />
        <SelectField
          label="Payment method"
          name="payment_method"
          options={['Cash', 'Card', 'Insurance']}
        />
        {formError && <p className="error wide">{formError}</p>}
        <FormActions onClose={onClose} saving={saving} label="Create invoice" />
      </form>
    </Modal>
  );
}
export function TherapistForm({ token, onClose, onSuccess }: any) {
  const { saving, formError, setFormError, createTherapist } = useClinicForms(token, onSuccess);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values: any = Object.fromEntries(new FormData(event.currentTarget));
    values.working_days = new FormData(event.currentTarget).getAll('working_days').join(',');
    if (!values.working_days) {
      setFormError('Select at least one working day.');
      return;
    }
    values.slot_duration = Number(values.slot_duration);
    setFormError('');
    try {
      await createTherapist(values);
    } catch (reason: any) {
      setFormError(reason.message);
    }
  }
  return (
    <Modal
      title="Add therapist"
      subtitle="Set the therapist’s specialty and regular clinic availability."
      onClose={onClose}
    >
      <form onSubmit={submit} className="form-grid">
        <FormField label="Full name" name="name" />
        <FormField label="Specialty" name="specialty" />
        <DayMultiSelect name="working_days" />
        <FormField
          label="Slot duration (minutes)"
          name="slot_duration"
          type="number"
          defaultValue="60"
        />
        <FormField label="Start time" name="start_time" defaultValue="09:00" />
        <FormField label="End time" name="end_time" defaultValue="17:00" />
        {formError && <p className="error wide">{formError}</p>}
        <FormActions onClose={onClose} saving={saving} label="Add therapist" />
      </form>
    </Modal>
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
