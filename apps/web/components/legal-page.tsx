import Link from 'next/link';

/**
 * Shared chrome for the legal documents (Terms, Privacy). Renders a draft
 * banner — this content is a working draft pending review by Capt. Ng'ong'a /
 * legal counsel and is not yet a binding instrument.
 */
export function LegalPage({
  title,
  lastUpdated,
  version,
  children,
}: {
  title: string;
  lastUpdated: string;
  version: string;
  children: React.ReactNode;
}) {
  return (
    <article className="mx-auto max-w-3xl">
      <header className="border-b-2 border-amber-500 pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-navy-900">{title}</h1>
        <p className="mt-1 text-xs text-slate-500">
          DN Consultancy Aviation · Last updated {lastUpdated} · {version}
        </p>
      </header>
      <p className="mt-4 rounded border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
        <strong>Draft for review.</strong> This document is a working draft pending review by DNCA
        and legal counsel; it is not yet a binding instrument. Defined terms align with the Kenya
        Data Protection Act, 2019 and KCARs 2025.
      </p>
      <div className="legal-body mt-6 space-y-5 text-sm leading-relaxed text-slate-700">
        {children}
      </div>
      <nav className="mt-10 border-t border-slate-200 pt-4 text-xs text-slate-500">
        <Link href="/legal/terms" className="mr-4 underline hover:text-navy-700">
          Terms of Use
        </Link>
        <Link href="/legal/privacy" className="mr-4 underline hover:text-navy-700">
          Privacy Notice
        </Link>
        <Link href="/" className="underline hover:text-navy-700">
          Back to dashboard
        </Link>
      </nav>
    </article>
  );
}

export function LegalSection({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-2 text-base font-semibold text-navy-900">{heading}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}
