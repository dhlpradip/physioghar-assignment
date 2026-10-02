'use client';

import { useState, type FormEvent } from 'react';
import { useAuthSession } from './useAuthSession';
import { useClinicData } from './useClinicData';
import { useDebounce } from './useDebounce';
import type { ModalKind, View } from '../types';
import type { EditTarget } from '../../components/EditRecordModal';

const today = () => new Date().toISOString().slice(0, 10);

export function usePhysioDeskApp(initialView: View, patientId?: number) {
  const { token, user, signIn, signOut } = useAuthSession();
  const [view, setView] = useState<View>(initialView);
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(patientId ?? null);
  const [bookingPatientId, setBookingPatientId] = useState<number | null>(null);
  const [editing, setEditing] = useState<EditTarget | null>(null);
  const [scheduleDate, setScheduleDate] = useState(today());
  const [search, setSearch] = useState('');
  const [patientStatus, setPatientStatus] = useState('All');
  const [patientTherapist, setPatientTherapist] = useState('All');
  const [modal, setModal] = useState<ModalKind>(null);
  const debouncedSearch = useDebounce(search);
  const clinic = useClinicData(token, view, debouncedSearch, scheduleDate, selectedPatientId);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    clinic.setError('');
    try {
      await signIn(String(form.get('email')), String(form.get('password')));
    } catch (reason: any) {
      clinic.setError(reason.message);
    }
  }

  function changeView(next: View) {
    if (next === view) return;
    clinic.setData(null);
    clinic.setError('');
    setSearch('');
    setView(next);
  }

  function openBooking(id?: number) {
    setBookingPatientId(id ?? null);
    setModal('appointment');
  }

  function openPatientProfile(id: number) {
    setSelectedPatientId(id);
    clinic.setData(null);
    setView('Patient profile');
  }

  function closeModal() {
    setModal(null);
    setBookingPatientId(null);
  }

  async function completed() {
    closeModal();
    setEditing(null);
    await Promise.all([clinic.load(), clinic.refreshCatalog()]);
  }

  function logout() {
    signOut();
    clinic.setData(null);
  }

  return {
    ...clinic,
    token,
    user,
    view,
    modal,
    editing,
    bookingPatientId,
    search,
    patientStatus,
    patientTherapist,
    scheduleDate,
    setSearch,
    setPatientStatus,
    setPatientTherapist,
    setScheduleDate,
    setEditing,
    setModal,
    handleLogin,
    changeView,
    openBooking,
    openPatientProfile,
    closeModal,
    completed,
    logout,
  };
}
