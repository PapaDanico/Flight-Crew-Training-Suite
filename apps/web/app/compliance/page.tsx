import {
  DOMAIN_CROSS_REFERENCE,
  KCARS_2025_INSTRUMENTS,
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
          <p className="mt-1 text-xs text-slate-600">
            {THIRD_SCHEDULE.title} ({THIRD_SCHEDULE.reference}) — {THIRD_SCHEDULE.totalClauseCount}{' '}
            binding clauses, transcribed from the gazetted notice.
          </p>
          <ul className="mt-3 space-y-1 text-sm text-slate-700">
            {THIRD_SCHEDULE.sections.map((s) => (
              <li key={s.ref}>
                <strong>{s.ref}</strong> {s.title} — {s.clauses.length} clauses
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-slate-600">
            Key clauses: §2.1.2 flight &amp; duty time / rest scheme · §2.1.25 stabilised approach ·
            §2.1.30 CFIT/GPWS &amp; UPRT · §2.1.35 dangerous goods · §2.4 training programmes.
          </p>
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

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">
          KCARs 2025 source provenance
        </h2>
        <p className="mb-3 max-w-3xl text-xs text-slate-600">
          Verification state of each cited Legal Notice against the authoritative primary source —
          the gazette PDF on file or the official Kenya Law record. A{' '}
          <span className="font-semibold text-emerald-800">verified</span> row links to its Kenya
          Law URN; a <span className="font-semibold text-amber-800">provisional</span> instrument
          (none at present) is badged wherever it is cited until its source is confirmed.
        </p>
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-200">
              {KCARS_2025_INSTRUMENTS.map((i) => (
                <tr key={i.instrumentId} className="hover:bg-slate-50">
                  <td className="w-28 px-3 py-2 align-top font-medium text-navy-900">
                    {i.authoritativeUrl ? (
                      <a
                        href={i.authoritativeUrl}
                        target="_blank"
                        rel="noopener"
                        className="text-navy-700 underline decoration-dotted hover:text-navy-900"
                      >
                        {i.shortLabel}
                      </a>
                    ) : (
                      i.shortLabel
                    )}
                    {i.effectiveDate ? (
                      <div className="text-[10px] font-normal text-slate-400">
                        eff. {i.effectiveDate}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 align-top">
                    {i.primarySourceVerified ? (
                      <span className="rounded bg-emerald-100 px-1.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800">
                        verified
                      </span>
                    ) : (
                      <span className="rounded bg-amber-100 px-1.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                        provisional
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 align-top text-xs text-slate-600">
                    {i.longLabel.replace(/^Legal Notice \d+ of 2026 — /, '')}
                    {i.notes ? <div className="mt-0.5 text-slate-400">{i.notes}</div> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

/**
 * A KCARs citation is "provisional" when its instrument has not been confirmed
 * against the gazetted primary source on file. Inspector-facing surfaces badge
 * these so an unverified LN number is never presented as settled fact.
 */
function isProvisional(c: Citation): boolean {
  return c.instrument.framework === 'KCARs' && c.instrument.primarySourceVerified !== true;
}

function CitationCell({ citations }: { citations: ReadonlyArray<Citation> }) {
  return (
    <td className="px-3 py-2 align-top text-slate-700">
      <div className="space-y-1">
        {citations.map((c, idx) => (
          <div key={idx} className="text-xs">
            {c.instrument.authoritativeUrl ? (
              <a
                href={c.instrument.authoritativeUrl}
                target="_blank"
                rel="noopener"
                className="font-medium text-navy-700 underline decoration-dotted hover:text-navy-900"
              >
                {c.instrument.shortLabel}
              </a>
            ) : (
              <span className="font-medium">{c.instrument.shortLabel}</span>
            )}
            {c.section ? <span> {c.section}</span> : null}
            {isProvisional(c) ? (
              <span
                title="Provisional — not yet confirmed against the gazetted primary source on file"
                className="ml-1 rounded bg-amber-100 px-1 text-[9px] font-semibold uppercase tracking-wide text-amber-800"
              >
                provisional
              </span>
            ) : null}
            {c.subject ? <div className="text-slate-500">{c.subject}</div> : null}
            <div className="sr-only">
              {formatCitation(c)}
              {isProvisional(c) ? ' (provisional — primary source not on file)' : ''}
            </div>
          </div>
        ))}
      </div>
    </td>
  );
}
