'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, Menu, Plane, X } from 'lucide-react';

/**
 * Primary navigation.
 *
 * The flat link row did not scale: it had no mobile affordance, and three KCAA
 * export routes (/exports/*) were unreachable from the nav at all. The IA below
 * groups destinations by job-to-be-done into a small set of menus, surfaced as
 * dropdowns on desktop and a hamburger accordion drawer on mobile. This both
 * fixes the small-screen experience and brings the orphaned exports into reach.
 */

interface NavLeaf {
  href: string;
  label: string;
}

interface NavGroup {
  label: string;
  children: ReadonlyArray<NavLeaf>;
}

type NavItem = NavLeaf | NavGroup;

function isGroup(item: NavItem): item is NavGroup {
  return (item as NavGroup).children !== undefined;
}

const NAV: ReadonlyArray<NavItem> = [
  { href: '/', label: 'Dashboard' },
  {
    label: 'Crew',
    children: [
      { href: '/pilots', label: 'Pilots' },
      { href: '/sessions', label: 'Sessions' },
      { href: '/assessments', label: 'Assessments' },
    ],
  },
  { href: '/aircraft', label: 'Aircraft' },
  {
    label: 'Compliance & exports',
    children: [
      { href: '/compliance', label: 'Compliance overview' },
      { href: '/exports/crew-currency-snapshot', label: 'Crew Currency Snapshot' },
      { href: '/exports/pilot-training-file', label: 'Pilot Training File' },
      { href: '/exports/om-cross-reference-matrix', label: 'OM Cross-Reference Matrix' },
    ],
  },
];

function useActive(pathname: string | null) {
  return (href: string) => (href === '/' ? pathname === '/' : (pathname ?? '').startsWith(href));
}

export function SiteHeader() {
  const pathname = usePathname();
  const isActive = useActive(pathname);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  return (
    <header className="border-b-4 border-amber-500 bg-navy-900 text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 sm:py-4">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <div className="shrink-0 rounded bg-amber-500 p-2">
            <Plane className="h-5 w-5 text-navy-900" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-bold tracking-tight sm:text-base">
              Fokker 70/100 Flight Crew Training Suite
            </div>
            <div className="hidden text-xs text-slate-300 sm:block">
              DN Consultancy Aviation — KCARs 2025 / ICAO Annex 1 &amp; 6 / FAA Part 121 / EASA
              Part-CAT
            </div>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {NAV.map((item) =>
            isGroup(item) ? (
              <DesktopMenu key={item.label} group={item} isActive={isActive} />
            ) : (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href) ? 'page' : undefined}
                className={`rounded px-3 py-2 text-sm font-medium transition hover:bg-navy-800 hover:text-white ${
                  isActive(item.href) ? 'bg-navy-800 text-white' : 'text-slate-300'
                }`}
              >
                {item.label}
              </Link>
            ),
          )}
        </nav>

        {/* Mobile hamburger */}
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="rounded p-2 text-slate-200 hover:bg-navy-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 md:hidden"
          aria-label="Open navigation menu"
          aria-expanded={drawerOpen}
          aria-controls="mobile-drawer"
        >
          <Menu className="h-6 w-6" />
        </button>
      </div>

      {drawerOpen ? (
        <MobileDrawer onClose={() => setDrawerOpen(false)} isActive={isActive} />
      ) : null}
    </header>
  );
}

function DesktopMenu({
  group,
  isActive,
}: {
  group: NavGroup;
  isActive: (href: string) => boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const groupActive = group.children.some((c) => isActive(c.href));

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={`flex items-center gap-1 rounded px-3 py-2 text-sm font-medium transition hover:bg-navy-800 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
          groupActive ? 'bg-navy-800 text-white' : 'text-slate-300'
        }`}
      >
        {group.label}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-1 w-60 rounded-lg border border-slate-200 bg-white py-1 text-slate-700 shadow-lg"
        >
          {group.children.map((child) => (
            <Link
              key={child.href}
              href={child.href}
              role="menuitem"
              aria-current={isActive(child.href) ? 'page' : undefined}
              className={`block px-4 py-2 text-sm hover:bg-amber-50 ${
                isActive(child.href) ? 'font-semibold text-navy-900' : ''
              }`}
            >
              {child.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function MobileDrawer({
  onClose,
  isActive,
}: {
  onClose: () => void;
  isActive: (href: string) => boolean;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="md:hidden">
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} aria-hidden="true" />
      <aside
        id="mobile-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
        className="fixed inset-y-0 right-0 z-50 w-80 max-w-[85%] overflow-y-auto bg-navy-900 text-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-navy-800 px-4 py-3">
          <span className="text-sm font-bold">Menu</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-2 text-slate-200 hover:bg-navy-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            aria-label="Close navigation menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="px-2 py-2" aria-label="Mobile primary">
          {NAV.map((item) =>
            isGroup(item) ? (
              <MobileAccordion key={item.label} group={item} isActive={isActive} />
            ) : (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href) ? 'page' : undefined}
                className={`block rounded px-3 py-3 text-sm font-medium hover:bg-navy-800 ${
                  isActive(item.href) ? 'bg-navy-800' : 'text-slate-200'
                }`}
              >
                {item.label}
              </Link>
            ),
          )}
        </nav>
      </aside>
    </div>
  );
}

function MobileAccordion({
  group,
  isActive,
}: {
  group: NavGroup;
  isActive: (href: string) => boolean;
}) {
  const groupActive = group.children.some((c) => isActive(c.href));
  const [open, setOpen] = useState(groupActive);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between rounded px-3 py-3 text-sm font-medium text-slate-200 hover:bg-navy-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
      >
        <span>{group.label}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open ? (
        <div className="pb-1 pl-3">
          {group.children.map((child) => (
            <Link
              key={child.href}
              href={child.href}
              aria-current={isActive(child.href) ? 'page' : undefined}
              className={`block rounded px-3 py-2 text-sm hover:bg-navy-800 ${
                isActive(child.href) ? 'font-semibold text-amber-300' : 'text-slate-300'
              }`}
            >
              {child.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
