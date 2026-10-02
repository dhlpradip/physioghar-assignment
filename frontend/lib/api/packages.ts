import { api } from '../api';
export const listPackages = (token: string) => api('/packages', token);
