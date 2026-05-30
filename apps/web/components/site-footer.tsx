import Link from 'next/link';

/**
 * Site footer — brand lockup, legal navigation (Terms / Privacy / Sign in) and
 * the data-protection line. Server component; plain links.
 */
export function SiteFooter() {
  return (
    <footer className="mt-12 border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-6 pb-10 pt-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/logo-lockup.png"
              alt="DN Consultancy — Shaping Africa's Future, Together"
              className="mb-3 h-14 w-auto"
            />
            <p className="text-xs text-slate-500">
              Multi-tenant flight crew training management, anchored to KCARs 2025 and the Kenya
              Data Protection Act 2019.
            </p>
          </div>

          <nav aria-label="Legal" className="text-sm">
            <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Legal &amp; access
            </h2>
            <ul className="space-y-1.5">
              <li>
                <Link
                  href="/legal/terms"
                  className="text-navy-700 hover:text-navy-900 hover:underline"
                >
                  Terms of Use
                </Link>
              </li>
              <li>
                <Link
                  href="/legal/privacy"
                  className="text-navy-700 hover:text-navy-900 hover:underline"
                >
                  Privacy Notice
                </Link>
              </li>
              <li>
                <Link href="/sign-in" className="text-navy-700 hover:text-navy-900 hover:underline">
                  Sign in
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        <div className="mt-8 border-t border-slate-100 pt-4 text-xs text-slate-500">
          <p>
            &copy; DN Consultancy Aviation, 2026. Proprietary. DNCA is the data controller for the
            purposes of the Kenya Data Protection Act 2019 — see the{' '}
            <Link href="/legal/privacy" className="underline hover:text-navy-700">
              Privacy Notice
            </Link>
            . Platform under active development.
          </p>
        </div>
      </div>
    </footer>
  );
}
