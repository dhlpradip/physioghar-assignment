'use client';
import { deletePatient } from '../../../lib/api/patients';
import type { EditTarget } from '../../EditRecordModal';
function statusClass(value: string) {
  return ['Paid', 'Active', 'Booked', 'Completed'].includes(value)
    ? 'success'
    : ['Due', 'Void', 'Cancelled'].includes(value)
      ? 'danger'
      : 'neutral';
}
export function PatientsView({
  items,
  token,
  openBooking,
  openProfile,
  openEdit,
}: {
  items: any[];
  token: string;
  openBooking: (id: number) => void;
  openProfile: (id: number) => void;
  openEdit: (target: EditTarget) => void;
}) {
  const patients = Array.isArray(items) ? items : [];
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Patient</th>
            <th>Phone</th>
            <th>Condition</th>
            <th>Therapist</th>
            <th>Package</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {patients.map((patient) => (
            <tr key={patient.id}>
              <td>
                <button className="patient-link" onClick={() => openProfile(patient.id)}>
                  {patient.name}
                </button>
                <br />
                <span className="muted">#{patient.id}</span>
              </td>
              <td className="mono">{patient.phone}</td>
              <td>{patient.condition}</td>
              <td>{patient.therapist_name || <span className="muted">Unassigned</span>}</td>
              <td>{patient.package_name || patient.package}</td>
              <td>
                <span className={`pill ${statusClass(patient.status)}`}>{patient.status}</span>
              </td>
              <td className="row-actions">
                {!patient.therapist_id && patient.status === 'Active' && (
                  <button className="assign-button" onClick={() => openBooking(patient.id)}>
                    Assign
                  </button>
                )}
                <button
                  className="assign-button"
                  onClick={() => openEdit({ kind: 'patient', record: patient })}
                >
                  Edit
                </button>
                <button
                  className="assign-button"
                  onClick={async () => {
                    if (window.confirm(`Delete ${patient.name}?`)) {
                      try {
                        await deletePatient(token, patient.id);
                        window.location.reload();
                      } catch (e: any) {
                        window.alert(e.message);
                      }
                    }
                  }}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
