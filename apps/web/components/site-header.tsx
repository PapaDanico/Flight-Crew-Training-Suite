import Link from 'next/link';
import { AuthStatus } from './auth-status';
import { PrimaryNav } from './primary-nav';

/**
 * App header. Server Component: it renders the brand and the WorkOS AuthStatus
 * (a Server Component with a server action) and hands the auth widget to the
 * client PrimaryNav as slots — keeping the server action out of the client
 * boundary while the nav stays interactive (dropdowns + mobile drawer).
 */
export function SiteHeader() {
  return (
    <header className="border-b-4 border-amber-500 bg-navy-900 text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 sm:py-4">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white ring-1 ring-amber-500/60">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/logo-badge.png"
              alt="DN Consultancy"
              className="h-10 w-10 object-contain"
            />
          </span>
          <div className="min-w-0">
            <div className="truncate text-sm font-bold tracking-tight sm:text-base">
              Flight Crew Training Suite
            </div>
            <div className="hidden text-xs text-slate-300 sm:block">
              DN Consultancy Aviation — KCARs 2025 / ICAO Annex 1 &amp; 6 / FAA Part 121 / EASA
              Part-CAT
            </div>
          </div>
        </Link>
        <PrimaryNav desktopAuth={<AuthStatus />} mobileAuth={<AuthStatus />} />
      </div>
    </header>
  );
}
