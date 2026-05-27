import type { Metadata } from 'next';
import { SiteHeader } from '@/components/site-header';
import './globals.css';

export const metadata: Metadata = {
  title: 'Flight Crew Training Suite — DN Consultancy Aviation',
  description: 'Multi-tenant flight crew training management platform anchored to KCARs 2025.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SiteHeader />
        <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
        <footer className="mx-auto mt-12 max-w-7xl px-6 pb-8 text-xs text-slate-500">
          &copy; DN Consultancy Aviation, 2026. Proprietary. KCARs 2025 / Kenya DPA 2019 compliant
          platform under active development.
        </footer>
      </body>
    </html>
  );
}
