import { api } from '../api';
export const listAppointments = (token: string, date: string) =>
  api(`/appointments?date=${date}`, token);
export const createAppointment = (token: string, values: unknown) =>
  api('/appointments', token, { method: 'POST', body: JSON.stringify(values) });
export const updateAppointment = (token: string, id: number, values: unknown) =>
  api(`/appointments/${id}`, token, { method: 'PUT', body: JSON.stringify(values) });
