import {
  DEMO_OPERATORS,
  buildLetterOfEffectivePages,
  type DocumentPage,
  type DocumentVersionId,
  type IsoDate,
  type IsoDateTime,
  type LetterOfEffectivePages,
  type OperatorId,
} from '@dnca/domain';
import { buildKcaaTransmittalLetter } from '@dnca/exports';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ operatorId?: string; planDays?: string }>;
}

/** Synthesise a small demo OM-A version with per-page revisions for the LEP. */
function demoPages(generatedAt: Date): DocumentPage[] {
  const dvId = 'demo-omadv-7' as DocumentVersionId;
  const day = (offset: number): IsoDateTime => {
    const d = new Date(generatedAt);
    d.setUTCDate(d.getUTCDate() - offset);
    return d.toISOString() as IsoDateTime;
  };
  return [
    {
      documentVersionId: dvId,
      pageNumber: 1,
      revisionLabel: 'Rev 7',
      lastRevisedAt: day(8),
      contentHash: 'a1',
    },
    {
      documentVersionId: dvId,
      pageNumber: 2,
      revisionLabel: 'Rev 6',
      lastRevisedAt: day(40),
      contentHash: 'a2',
    },
    {
      documentVersionId: dvId,
      pageNumber: 3,
      revisionLabel: 'Rev 7',
      lastRevisedAt: day(8),
      contentHash: 'a3',
    },
    {
      documentVersionId: dvId,
      pageNumber: 4,
      revisionLabel: 'Rev 5',
      lastRevisedAt: day(120),
      contentHash: 'a4',
    },
    {
      documentVersionId: dvId,
      pageNumber: 5,
      revisionLabel: 'Rev 7',
      lastRevisedAt: day(8),
      contentHash: 'a5',
    },
  ];
}

export default async function KcaaTransmittalPage({ searchParams }: PageProps) {
  const { operatorId, planDays } = await searchParams;
  const operator =
    (operatorId
      ? DEMO_OPERATORS.find((o) => o.id === (operatorId as OperatorId))
      : DEMO_OPERATORS[0]) ?? DEMO_OPERATORS[0]!;

  const generatedAt = new Date();
  const leadDays = Number.isFinite(Number(planDays)) ? Number(planDays) : 60;
  const planned = new Date(generatedAt);
  planned.setUTCDate(planned.getUTCDate() + leadDays);
  const plannedImplementation = planned.toISOString().slice(0, 10) as IsoDate;
  const asOf = generatedAt.toISOString().slice(0, 10) as IsoDate;

  const lep = buildLetterOfEffectivePages(demoPages(generatedAt));
  const letter = buildKcaaTransmittalLetter({
    operator,
    document: { title: 'Operations Manual Part A', shortCode: 'OM-A', kind: 'OM_A' },
    version: { versionLabel: 'Rev 7' },
    plannedImplementation,
    asOf,
    signatory: { name: 'Capt. D. Ngʼongʼa', title: 'Head of Training' },
    generatedAt,
    lep,
  });

  return (
    <>
      <PrintStyle />
      <div className="print-root font-sans text-slate-800">
        <Toolbar operatorTradingName={operator.tradingName} planned={plannedImplementation} />
        <article className="letter mx-auto max-w-3xl bg-white p-10 print:m-0 print:max-w-none print:p-0">
          <header className="flex items-end justify-between border-b-2 border-amber-500 pb-3">
            <div>
              <h1 className="text-lg font-bold text-navy-900">{letter.operatorName}</h1>
              <div className="text-[10px] text-slate-600">AOC {letter.aocNumber}</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold text-navy-900">KCAA TRANSMITTAL LETTER</div>
              <div className="text-[10px] text-slate-600">Ref {letter.reference}</div>
            </div>
          </header>

          <section className="mt-6 text-[12px] leading-relaxed">
            <div className="text-slate-600">{letter.date}</div>
            <div className="mt-3 font-semibold text-navy-900">{letter.to}</div>
            <div className="mt-4 font-bold">{letter.subject}</div>
            <p className="mt-3">{letter.salutation}</p>
            {letter.bodyParagraphs.map((p, i) => (
              <p key={i} className="mt-3">
                {p}
              </p>
            ))}

            {letter.overrideWarning ? (
              <p className="mt-3 rounded border border-red-300 bg-red-50 p-3 text-[11px] text-red-800">
                <strong>Late-submission notice — </strong>
                {letter.overrideWarning}
              </p>
            ) : (
              <p className="mt-3 rounded border border-emerald-300 bg-emerald-50 p-3 text-[11px] text-emerald-800">
                Submitted with {letter.readiness.daysUntilDeadline} day(s) to spare against the Reg
                17(3) deadline of {letter.readiness.submissionDeadline}.
              </p>
            )}

            <p className="mt-6">{letter.closing}</p>
            <div className="mt-8">
              <div className="font-bold text-navy-900">{letter.signatoryName}</div>
              <div className="text-[11px] text-slate-600">{letter.signatoryTitle}</div>
              <div className="text-[11px] text-slate-600">{letter.operatorName}</div>
            </div>
          </section>

          <LepTable lep={lep} effectiveLabel={letter.readiness.plannedImplementation} />

          <footer className="mt-8 border-t border-slate-200 pt-3 text-[9px] text-slate-500">
            <div>
              Generated by DNCA Flight Crew Training Suite · {letter.regCitation} ·{' '}
              {generatedAt.toISOString()}
            </div>
            <div className="mt-1">
              Submission deadline and the Letter of Effective Pages are computed by{' '}
              <code>@dnca/domain</code>; the 30-day lead is Reg 17(3) of LN 42/2026. Implementation
              before the Authority&apos;s approval is prohibited.
            </div>
          </footer>
        </article>
      </div>
    </>
  );
}

function LepTable({
  lep,
  effectiveLabel,
}: {
  lep: LetterOfEffectivePages;
  effectiveLabel: IsoDate;
}) {
  return (
    <section className="lep mt-8">
      <h2 className="bg-navy-900 px-2 py-1 text-[11px] font-bold text-white">
        Letter of Effective Pages
      </h2>
      <div className="bg-slate-100 px-2 py-1 text-[10px] text-slate-700">
        {lep.pageCount} effective page{lep.pageCount === 1 ? '' : 's'}
        {lep.effectiveDate ? ` · latest revision ${lep.effectiveDate}` : ''} · intended
        implementation {effectiveLabel}
      </div>
      <table className="mt-1 w-full border-collapse text-[10px]">
        <thead>
          <tr className="border-b border-slate-400 bg-slate-100 text-left text-[8px] uppercase tracking-wide text-slate-600">
            <th className="w-[20%] py-1 pl-1">Page</th>
            <th className="w-[40%] py-1">Revision</th>
            <th className="w-[40%] py-1 pr-1">Last revised</th>
          </tr>
        </thead>
        <tbody>
          {lep.rows.map((r) => (
            <tr key={r.pageNumber} className="border-b border-slate-200">
              <td className="py-1 pl-1">{r.pageNumber}</td>
              <td className="py-1">{r.revisionLabel}</td>
              <td className="py-1 pr-1">{r.lastRevisedAt.slice(0, 10)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function Toolbar({
  operatorTradingName,
  planned,
}: {
  operatorTradingName: string;
  planned: IsoDate;
}) {
  return (
    <div className="no-print sticky top-0 z-10 border-b border-slate-200 bg-amber-50 px-4 py-2 text-xs">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3">
        <div className="text-amber-900">
          <strong>{operatorTradingName}</strong> — implementation {planned}. Use{' '}
          <kbd className="rounded bg-amber-200 px-1">⌘P</kbd>/
          <kbd className="rounded bg-amber-200 px-1">Ctrl+P</kbd> to save as PDF.
        </div>
        <div className="flex flex-wrap gap-2">
          {DEMO_OPERATORS.map((op) => (
            <a
              key={op.id}
              href={`?operatorId=${op.id}`}
              className="rounded border border-amber-300 bg-white px-2 py-1 text-amber-900 hover:bg-amber-100"
            >
              {op.tradingName}
            </a>
          ))}
          <a
            href="?planDays=10"
            className="rounded border border-red-300 bg-white px-2 py-1 text-red-800 hover:bg-red-50"
          >
            Late-submission demo
          </a>
        </div>
      </div>
    </div>
  );
}

function PrintStyle() {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
@media print {
  .no-print { display: none !important; }
  body { background: white !important; }
  .lep { break-inside: avoid; }
  @page {
    size: A4 portrait;
    margin: 12mm 14mm;
  }
}
        `,
      }}
    />
  );
}
