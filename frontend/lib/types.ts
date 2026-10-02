export type User = { name: string; email: string; role: string };
export type View =
  'Dashboard' | 'Patients' | 'Schedule' | 'Billing' | 'Therapists' | 'Patient profile';
export type ModalKind = 'patient' | 'appointment' | 'invoice' | 'therapist' | null;
