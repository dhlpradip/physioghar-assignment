'use client';
import { useCallback, useEffect, useState } from 'react';
import { clearSession, getSession, setSession } from '../auth';
import { login } from '../api/auth';
import type { User } from '../types';

export function useAuthSession() {
  const [token, setToken] = useState('');
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => {
    const session = getSession();
    if (session) {
      setToken(session.token);
      setUser(session.user);
    }
  }, []);
  const signIn = useCallback(async (email: string, password: string) => {
    const result = await login(email, password);
    setSession(result.access_token, result.user);
    setToken(result.access_token);
    setUser(result.user);
  }, []);
  const signOut = useCallback(() => {
    clearSession();
    setToken('');
    setUser(null);
  }, []);
  return { token, user, signIn, signOut };
}
