'use client';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '../../lib/api';
import { setSession } from '../../lib/auth';
export function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      const result = await login(String(f.get('email')), String(f.get('password')));
      setSession(result.access_token, result.user);
      router.push('/dashboard');
    } catch (e: any) {
      setError(e.message);
    }
  }
  return (
    <main className="login">
      <section className="login-card">
        <p className="eyebrow">Clinic management</p>
        <h1>
          Physio<span>Desk</span>
        </h1>
        <p>Sign in to manage your clinic with clarity.</p>
        <form onSubmit={submit}>
          <label>
            Email
            <input
              className="input"
              name="email"
              type="email"
              defaultValue="admin@physiodesk.test"
              required
            />
          </label>
          <label>
            Password
            <input
              className="input"
              name="password"
              type="password"
              defaultValue="Admin123!"
              required
            />
          </label>
          {error && <p className="error">{error}</p>}
          <button className="button full">Sign in</button>
        </form>
      </section>
    </main>
  );
}

export { LoginPage as default };
