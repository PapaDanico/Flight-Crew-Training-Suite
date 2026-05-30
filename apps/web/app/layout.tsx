import type { Metadata } from 'next';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
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
        <main className="mx-auto min-h-[60vh] max-w-7xl px-6 py-8">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
