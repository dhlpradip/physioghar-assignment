'use client';

import { useState } from 'react';
import { updateAppointment } from '../api/appointments';
import { updateInvoice } from '../api/invoices';
import { updatePatient } from '../api/patients';
import { createTherapistOverride, updateTherapist } from '../api/therapists';
import type { EditTarget } from '../../components/EditRecordModal';

export function useEditRecord(token: string, target: EditTarget, onSuccess: () => Promise<void>) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function save(values: any, override?: any) {
    setSaving(true);
    setError('');
    try {
      if (target.kind === 'patient') await updatePatient(token, target.record.id, values);
      else if (target.kind === 'invoice') await updateInvoice(token, target.record.id, values);
      else if (target.kind === 'therapist') {
        await updateTherapist(token, target.record.id, values);
        if (override) await createTherapistOverride(token, target.record.id, override);
      } else {
        await updateAppointment(token, target.record.id, values);
      }
      await onSuccess();
    } catch (reason: any) {
      setError(reason.message);
    } finally {
      setSaving(false);
    }
  }

  return { saving, error, setError, save };
}
