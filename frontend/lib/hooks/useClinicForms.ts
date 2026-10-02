'use client';

import { useState } from 'react';
import { createAppointment } from '../api/appointments';
import { createInvoice } from '../api/invoices';
import { createPatient } from '../api/patients';
import { createTherapist } from '../api/therapists';

export function useClinicForms(token: string, onSuccess: () => void) {
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  async function submit(action: (token: string) => Promise<unknown>) {
    setSaving(true);
    setFormError('');
    try {
      await action(token);
      onSuccess();
    } catch (reason: any) {
      setFormError(reason.message);
    } finally {
      setSaving(false);
    }
  }

  return {
    saving,
    formError,
    setFormError,
    submit,
    createPatient: (values: any) => submit((auth) => createPatient(auth, values)),
    createAppointment: (values: any) => submit((auth) => createAppointment(auth, values)),
    createInvoice: (values: any) => submit((auth) => createInvoice(auth, values)),
    createTherapist: (values: any) => submit((auth) => createTherapist(auth, values)),
  };
}
