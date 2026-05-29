'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, Menu, X } from 'lucide-react';

/**
 * Client-side primary navigation: grouped dropdowns on desktop, a hamburger
 * accordion drawer on mobile. The WorkOS auth widget (a Server Component with
 * a server action) is rendered by the server SiteHeader and passed in as
 * `desktopAuth` / `mobileAuth` slots so it stays out of the client boundary.
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
      { href: '/scheduling', label: 'Training scheduling' },
      { href: '/notifications', label: 'Notifications' },
      { href: '/assessments', label: 'Assessments' },
    ],
  },
  { href: '/aircraft', label: 'Aircraft' },
  {
    label: 'Compliance & exports',
    children: [
      { href: '/compliance', label: 'Compliance overview' },
      { href: '/operators', label: 'Operator config' },
      { href: '/exports/crew-currency-snapshot', label: 'Crew Currency Snapshot' },
      { href: '/exports/pilot-training-file', label: 'Pilot Training File' },
      { href: '/exports/om-cross-reference-matrix', label: 'OM Cross-Reference Matrix' },
    ],
  },
];

function useActive(pathname: string | null) {
  const path = pathname ?? '';
  return (href: string) =>
    href === '/' ? path === '/' : path === href || path.startsWith(`${href}/`);
}

export function PrimaryNav({
  desktopAuth,
  mobileAuth,
}: {
  desktopAuth: ReactNode;
  mobileAuth: ReactNode;
}) {
  const pathname = usePathname();
  const isActive = useActive(pathname);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const burgerRef = useRef<HTMLButtonElement>(null);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    requestAnimationFrame(() => burgerRef.current?.focus());
  }, []);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  return (
    <div className="flex flex-1 items-center justify-end gap-2">
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

      <div className="hidden md:block">{desktopAuth}</div>

      <button
        type="button"
        ref={burgerRef}
        onClick={() => setDrawerOpen(true)}
        className="rounded p-2 text-slate-200 hover:bg-navy-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 md:hidden"
        aria-label="Open navigation menu"
        aria-expanded={drawerOpen}
        aria-controls="mobile-drawer"
      >
        <Menu className="h-6 w-6" />
      </button>

      {drawerOpen ? (
        <MobileDrawer onClose={closeDrawer} isActive={isActive} authSlot={mobileAuth} />
      ) : null}
    </div>
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
              onClick={() => setOpen(false)}
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
  authSlot,
}: {
  onClose: () => void;
  isActive: (href: string) => boolean;
  authSlot: ReactNode;
}) {
  const asideRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const focusables = (): HTMLElement[] =>
      asideRef.current
        ? Array.from(
            asideRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'),
          )
        : [];
    focusables()[0]?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0]!;
      const last = items[items.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div className="md:hidden">
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} aria-hidden="true" />
      <aside
        ref={asideRef}
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
        <div className="border-t border-navy-800 px-4 py-3">{authSlot}</div>
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
