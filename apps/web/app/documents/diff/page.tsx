import {
  buildLetterOfEffectivePages,
  diffDocumentVersions,
  type DocumentPage,
  type DocumentVersionId,
  type IsoDateTime,
  type PageDiff,
} from '@dnca/domain';

export const dynamic = 'force-dynamic';

/**
 * Heads-of-Training document version-diff view. Demonstrates the per-page diff
 * between two approved OM-A versions (Rev 6 → Rev 7). Backend wiring (real
 * document store) lands with the DB-backed write path; the diff logic itself is
 * pure @dnca/domain and identical to what production will render.
 */
function page(vid: string, n: number, rev: string, hash: string, revised: string): DocumentPage {
  return {
    documentVersionId: vid as DocumentVersionId,
    pageNumber: n,
    revisionLabel: rev,
    lastRevisedAt: revised as IsoDateTime,
    contentHash: hash,
  };
}

const FROM: DocumentPage[] = [
  page('omadv-6', 1, 'Rev 5', 'h1', '2026-01-10T00:00:00.000Z'),
  page('omadv-6', 2, 'Rev 6', 'h2', '2026-02-02T00:00:00.000Z'),
  page('omadv-6', 3, 'Rev 6', 'h3', '2026-02-02T00:00:00.000Z'),
  page('omadv-6', 4, 'Rev 4', 'h4', '2025-11-20T00:00:00.000Z'),
];
const TO: DocumentPage[] = [
  page('omadv-7', 1, 'Rev 5', 'h1', '2026-01-10T00:00:00.000Z'), // unchanged
  page('omadv-7', 2, 'Rev 7', 'h2b', '2026-05-21T00:00:00.000Z'), // revised (stabilised-approach gate)
  page('omadv-7', 4, 'Rev 4', 'h4', '2025-11-20T00:00:00.000Z'), // page 3 removed
  page('omadv-7', 5, 'Rev 7', 'h5', '2026-05-21T00:00:00.000Z'), // added (UPRT section)
];

const STYLES: Record<PageDiff['kind'], string> = {
  ADDED: 'bg-emerald-100 text-emerald-800',
  REMOVED: 'bg-red-100 text-red-800',
  REVISED: 'bg-amber-100 text-amber-800',
  UNCHANGED: 'bg-slate-100 text-slate-500',
};

export default function DocumentDiffPage() {
  const diff = diffDocumentVersions(FROM, TO);
  const lep = buildLetterOfEffectivePages(TO);
  const s = diff.summary;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-navy-900">Document version diff</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-700">
          Operations Manual Part A (OM-A) — <strong>Rev 6 → Rev 7</strong>. Manuals are versioned
          per page; this is the change set a Head of Training reviews before submitting an amendment
          to KCAA. Diff and Letter of Effective Pages are computed by{' '}
          <code className="rounded bg-slate-100 px-1 py-0.5">@dnca/domain</code>.
        </p>
      </header>

      <section className="flex flex-wrap gap-3 text-sm">
        <Pill label="Added" value={s.added} className="bg-emerald-100 text-emerald-800" />
        <Pill label="Revised" value={s.revised} className="bg-amber-100 text-amber-800" />
        <Pill label="Removed" value={s.removed} className="bg-red-100 text-red-800" />
        <Pill label="Unchanged" value={s.unchanged} className="bg-slate-100 text-slate-600" />
        <Pill label="Pages (target)" value={lep.pageCount} className="bg-navy-100 text-navy-900" />
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-navy-900 text-white">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Page</th>
              <th className="px-3 py-2 text-left font-medium">Change</th>
              <th className="px-3 py-2 text-left font-medium">Rev 6</th>
              <th className="px-3 py-2 text-left font-medium">Rev 7</th>
              <th className="px-3 py-2 text-left font-medium">Last revised</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {diff.pages.map((p) => (
              <tr key={p.pageNumber} className="hover:bg-slate-50">
                <td className="px-3 py-2 font-medium text-navy-900">{p.pageNumber}</td>
                <td className="px-3 py-2">
                  <span
                    className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold uppercase ${STYLES[p.kind]}`}
                  >
                    {p.kind}
                  </span>
                </td>
                <td className="px-3 py-2 text-slate-600">{p.fromRevisionLabel ?? '—'}</td>
                <td className="px-3 py-2 text-slate-600">{p.toRevisionLabel ?? '—'}</td>
                <td className="px-3 py-2 text-slate-500">{p.lastRevisedAt?.slice(0, 10) ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <p className="text-xs text-slate-500">
        Target version effective {lep.effectiveDate ?? '—'} ({lep.pageCount} effective pages). On a
        live deployment this view diffs the stored, content-hashed pages of two approved versions;
        the demo synthesises representative pages.
      </p>
    </div>
  );
}

function Pill({ label, value, className }: { label: string; value: number; className: string }) {
  return (
    <div className={`rounded-lg px-4 py-2 ${className}`}>
      <div className="text-[10px] uppercase tracking-wide opacity-70">{label}</div>
      <div className="text-lg font-bold">{value}</div>
    </div>
  );
}
