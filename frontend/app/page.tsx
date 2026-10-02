import { redirect } from 'next/navigation';
export function Home() {
  redirect('/dashboard');
}

export { Home as default };
