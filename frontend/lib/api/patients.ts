import { api } from '../api';
export const listPatients = (token: string, search = '') =>
  api(`/patients?search=${encodeURIComponent(search)}`, token);
export const listAvailablePatients = (token: string, unassigned = false) =>
  api(`/patients/available${unassigned ? '?unassigned=true' : ''}`, token);
export const getPatient = (token: string, id: number) => api(`/patients/${id}`, token);
export const createPatient = (token: string, values: unknown) =>
  api('/patients', token, { method: 'POST', body: JSON.stringify(values) });
export const updatePatient = (token: string, id: number, values: unknown) =>
  api(`/patients/${id}`, token, { method: 'PUT', body: JSON.stringify(values) });
export const deletePatient = (token: string, id: number) =>
  api(`/patients/${id}`, token, { method: 'DELETE' });
