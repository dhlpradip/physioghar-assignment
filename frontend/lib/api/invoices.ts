import { api } from '../api';
export const listInvoices = (token: string) => api('/invoices', token);
export const createInvoice = (token: string, values: unknown) =>
  api('/invoices', token, { method: 'POST', body: JSON.stringify(values) });
export const updateInvoice = (token: string, id: number, values: unknown) =>
  api(`/invoices/${id}`, token, { method: 'PUT', body: JSON.stringify(values) });
export const deleteInvoice = (token: string, id: number) =>
  api(`/invoices/${id}`, token, { method: 'DELETE' });
