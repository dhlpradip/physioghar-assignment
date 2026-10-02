'use client';
import { useCallback, useEffect, useState } from 'react';
import { getDashboard } from '../api/dashboard';
import { listAppointments } from '../api/appointments';
import { listInvoices } from '../api/invoices';
import { getPatient, listAvailablePatients, listPatients } from '../api/patients';
import { listPackages } from '../api/packages';
import { listTherapists } from '../api/therapists';
import type { View } from '../types';

export function useClinicData(
  token: string,
  view: View,
  search: string,
  scheduleDate: string,
  patientId: number | null,
) {
  const [data, setData] = useState<any>(null);
  const [catalog, setCatalog] = useState({
    patients: [],
    appointmentPatients: [],
    packages: [],
    therapists: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const refreshCatalog = useCallback(async () => {
    if (!token) return;
    const [patients, appointmentPatients, packages, therapists] = await Promise.all([
      listAvailablePatients(token),
      listAvailablePatients(token, true),
      listPackages(token),
      listTherapists(token),
    ]);
    setCatalog({ patients, appointmentPatients, packages, therapists });
  }, [token]);
  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const result =
        view === 'Dashboard'
          ? await getDashboard(token)
          : view === 'Patients'
            ? await listPatients(token, search)
            : view === 'Schedule'
              ? await listAppointments(token, scheduleDate)
              : view === 'Billing'
                ? await listInvoices(token)
                : view === 'Therapists'
                  ? await listTherapists(token, true)
                  : patientId
                    ? await getPatient(token, patientId)
                    : null;
      setData(result);
    } catch (reason: any) {
      setError(reason.message);
    } finally {
      setLoading(false);
    }
  }, [token, view, search, scheduleDate, patientId]);
  useEffect(() => void load(), [load]);
  useEffect(
    () => void refreshCatalog().catch((reason) => setError(reason.message)),
    [refreshCatalog],
  );
  return { data, setData, catalog, loading, error, setError, load, refreshCatalog };
}
