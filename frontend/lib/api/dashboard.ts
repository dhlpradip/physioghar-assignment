import { api } from '../api';
export const getDashboard = (token: string) => api('/dashboard', token);
