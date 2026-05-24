import Link from 'next/link';
import { Plane } from 'lucide-react';

const NAV_LINKS = [
  { href: '/', label: 'Dashboard' },
  { href: '/pilots', label: 'Pilots' },
  { href: '/sessions', label: 'Sessions' },
  { href: '/assessments', label: 'Assessments' },
  { href: '/aircraft', label: 'Aircraft' },
  { href: '/compliance', label: 'Compliance' },
] as const;

export function SiteHeader() {
  return (
    <header className="border-b-4 border-amber-500 bg-navy-900 text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <div className="rounded bg-amber-500 p-2">
            <Plane className="h-5 w-5 text-navy-900" />
          </div>
          <div>
            <div className="text-base font-bold tracking-tight">
              Fokker 70/100 Flight Crew Training Suite
            </div>
            <div className="text-xs text-slate-300">
              DN Consultancy Aviation — KCARs 2025 / ICAO Annex 1 &amp; 6 / FAA Part 121 / EASA
              Part-CAT
            </div>
          </div>
        </Link>
        <nav className="flex gap-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-navy-800 hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
