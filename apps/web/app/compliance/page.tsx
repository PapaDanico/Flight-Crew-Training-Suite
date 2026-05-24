import {
  DOMAIN_CROSS_REFERENCE,
  SIXTH_SCHEDULE_PENALTIES,
  THIRD_SCHEDULE,
  formatCitation,
  type Citation,
} from '@dnca/ontology';

export default function CompliancePage() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-navy-900">Regulatory Compliance</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-700">
          KCARs 2025 cross-referenced to ICAO Annexes &amp; Docs, FAA 14 CFR, and EASA Part-CAT /
          Part-ORO. Every cell is a typed{' '}
          <code className="rounded bg-slate-100 px-1 py-0.5">Citation</code> sourced from{' '}
          <code className="rounded bg-slate-100 px-1 py-0.5">@dnca/ontology</code>. Where an
          Advisory Circular conflicts with KCARs 2025, the regulation prevails.
        </p>
      </header>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">
          Cross-reference matrix
        </h2>
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-navy-900 text-white">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Domain</th>
                <th className="px-3 py-2 text-left font-medium">KCARs 2025 (Kenya)</th>
                <th className="px-3 py-2 text-left font-medium">FAA</th>
                <th className="px-3 py-2 text-left font-medium">EASA</th>
                <th className="px-3 py-2 text-left font-medium">ICAO</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {DOMAIN_CROSS_REFERENCE.map((row) => (
                <tr key={row.domain} className="hover:bg-slate-50">
                  <td className="px-3 py-2 align-top font-medium text-navy-900">{row.domain}</td>
                  <CitationCell citations={row.kcars} />
                  <CitationCell citations={row.faa} />
                  <CitationCell citations={row.easa} />
                  <CitationCell citations={row.icao} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-navy-900">LN 42/2026 Third Schedule</h3>
          <p className="mt-1 text-xs text-slate-600">{THIRD_SCHEDULE.section21.title}</p>
          <p className="mt-3 text-sm text-slate-700">
            <strong>§2.1</strong> — {THIRD_SCHEDULE.section21.clauseCount} OM content clauses.{' '}
            {THIRD_SCHEDULE.section21.knownClauses.length} populated from verified sources;
            remainder awaits the primary-source PDF.
          </p>
          <p className="mt-2 text-sm text-slate-700">
            <strong>§2.2</strong> — {THIRD_SCHEDULE.section22.topicCount} mandatory training topics.{' '}
            {THIRD_SCHEDULE.section22.knownTopics.length} populated.
          </p>
          {THIRD_SCHEDULE.section21.knownClauses.length > 0 ? (
            <ul className="mt-3 space-y-1 text-xs text-slate-600">
              {THIRD_SCHEDULE.section21.knownClauses.map((c) => (
                <li key={c.shortRef}>
                  <strong>{c.shortRef}</strong> — {c.subject}
                </li>
              ))}
            </ul>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-200 pt-3">
            <span className="text-[10px] text-slate-500">Submission attestation:</span>
            <a
              href="/exports/om-cross-reference-matrix?operatorId=11111111-1111-1111-1111-111111111111"
              target="_blank"
              rel="noopener"
              className="rounded border border-navy-300 bg-white px-2 py-1 text-[10px] font-medium text-navy-900 hover:bg-navy-50"
            >
              OM Matrix — JAK Demo
            </a>
            <a
              href="/exports/om-cross-reference-matrix?operatorId=22222222-2222-2222-2222-222222222222"
              target="_blank"
              rel="noopener"
              className="rounded border border-navy-300 bg-white px-2 py-1 text-[10px] font-medium text-navy-900 hover:bg-navy-50"
            >
              OM Matrix — I-Fly Demo
            </a>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-navy-900">Sixth Schedule penalties</h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            <li>
              <strong>A-class:</strong> up to KSh{' '}
              {SIXTH_SCHEDULE_PENALTIES.aClass.maxFineKsh.toLocaleString()} and/or{' '}
              {SIXTH_SCHEDULE_PENALTIES.aClass.maxImprisonmentYears} year imprisonment
            </li>
            <li>
              <strong>B-class:</strong> up to KSh{' '}
              {SIXTH_SCHEDULE_PENALTIES.bClass.maxFineKsh.toLocaleString()} and/or{' '}
              {SIXTH_SCHEDULE_PENALTIES.bClass.maxImprisonmentYears} years imprisonment
            </li>
          </ul>
          <p className="mt-3 rounded bg-amber-50 p-3 text-xs text-amber-900">
            {SIXTH_SCHEDULE_PENALTIES.notes}
          </p>
        </div>
      </section>
    </div>
  );
}

function CitationCell({ citations }: { citations: ReadonlyArray<Citation> }) {
  return (
    <td className="px-3 py-2 align-top text-slate-700">
      <div className="space-y-1">
        {citations.map((c, idx) => (
          <div key={idx} className="text-xs">
            <span className="font-medium">{c.instrument.shortLabel}</span>
            {c.section ? <span> {c.section}</span> : null}
            {c.subject ? <div className="text-slate-500">{c.subject}</div> : null}
            <div className="sr-only">{formatCitation(c)}</div>
          </div>
        ))}
      </div>
    </td>
  );
}
