import { api } from '../api';
export const listTherapists = (token: string, includeInactive = false) =>
  api(`/therapists${includeInactive ? '?include_inactive=true' : ''}`, token);
export const listAvailableTherapists = (token: string, date: string, time: string) =>
  api(`/therapists/available?date=${date}&time=${time}`, token);
export const createTherapist = (token: string, values: unknown) =>
  api('/therapists', token, { method: 'POST', body: JSON.stringify(values) });
export const updateTherapist = (token: string, id: number, values: unknown) =>
  api(`/therapists/${id}`, token, { method: 'PUT', body: JSON.stringify(values) });
export const createTherapistOverride = (token: string, id: number, values: unknown) =>
  api(`/therapists/${id}/overrides`, token, { method: 'POST', body: JSON.stringify(values) });
