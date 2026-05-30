import type { Metadata } from 'next';
import Link from 'next/link';
import { DEMO_OPERATORS } from '@dnca/domain';

export const metadata: Metadata = {
  title: 'Exports — DN Consultancy Aviation',
  description: 'KCAA-aligned export artefacts for inspection and submission.',
};

const OP = DEMO_OPERATORS[0]?.id ?? '';

const EXPORTS = [
  {
    href: '/exports/compliance-evidence-pack',
    title: 'Compliance Evidence Pack',
    desc: 'The index a Head of Training hands a KCAA inspector — currency posture, OM coverage, provenance, and links to every constituent artefact.',
    perOperator: true,
  },
  {
    href: '/exports/crew-currency-snapshot',
    title: 'Crew Currency Snapshot',
    desc: 'Operator-wide, point-in-time currency status for every pilot and item.',
    perOperator: true,
  },
  {
    href: '/exports/pilot-training-file',
    title: 'Pilot Training File',
    desc: 'Per-pilot complete history — currency, sessions, CBTA competency grades.',
    perOperator: false,
  },
  {
    href: '/exports/om-cross-reference-matrix',
    title: 'OM Cross-Reference Matrix',
    desc: 'LN 42/2026 Third Schedule clause → OM section → evidence. The Reg 17(3) submission attestation.',
    perOperator: true,
  },
  {
    href: '/exports/kcaa-transmittal',
    title: 'KCAA Transmittal Letter',
    desc: 'Reg 17(3) submission cover letter with the 30-day deadline and Letter of Effective Pages.',
    perOperator: true,
  },
  {
    href: '/documents/diff',
    title: 'Document Version Diff',
    desc: 'Per-page change set between two OM versions — what a Head of Training reviews before a KCAA amendment.',
    perOperator: false,
  },
];

export default function ExportsHubPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-navy-900">Exports</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-700">
          KCAA-aligned, inspector-facing artefacts. Each opens a print-ready view (⌘P / Ctrl+P to
          save as PDF); numbers are computed by{' '}
          <code className="rounded bg-slate-100 px-1">@dnca/domain</code> so they match the live
          platform exactly.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {EXPORTS.map((e) => {
          const href = e.perOperator && OP ? `${e.href}?operatorId=${OP}` : e.href;
          return (
            <Link
              key={e.href}
              href={href}
              target="_blank"
              rel="noopener"
              className="group rounded-lg border border-slate-200 bg-white p-5 transition hover:border-navy-300 hover:shadow-sm"
            >
              <h2 className="text-sm font-semibold text-navy-900 group-hover:text-navy-700">
                {e.title}
              </h2>
              <p className="mt-1 text-xs text-slate-600">{e.desc}</p>
              <span className="mt-3 inline-block text-[11px] font-medium text-amber-700">
                Open export →
              </span>
            </Link>
          );
        })}
      </div>

      <p className="text-xs text-slate-500">
        Per-operator exports open for the first demo operator; switch operator from the toolbar
        inside each export.
      </p>
    </div>
  );
}
