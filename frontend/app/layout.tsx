import type { Metadata } from 'next';
import './globals.css';
import { Fraunces, IBM_Plex_Mono, Inter } from 'next/font/google';
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const fraunces = Fraunces({ subsets: ['latin'], variable: '--font-fraunces' });
const mono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-mono' });
export const metadata: Metadata = { title: 'PhysioDesk', description: 'Clinic management' };
export function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${fraunces.variable} ${mono.variable}`}>{children}</body>
    </html>
  );
}

export { RootLayout as default };
