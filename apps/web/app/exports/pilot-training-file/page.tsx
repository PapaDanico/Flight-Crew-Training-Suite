import {
  DEMO_OPERATORS,
  DEMO_PILOTS,
  buildDemoCurrencyRecords,
  buildDemoSessions,
  type IsoDate,
  type PilotId,
} from '@dnca/domain';
import {
  buildPilotTrainingFile,
  COMPETENCY_LABEL,
  ICAO_COMPETENCY,
  type CompetencyTally,
  type Grade,
  type IcaoCompetency,
  type PtfCategoryBlock,
  type PtfCurrencyRow,
  type PtfSessionBlock,
} from '@dnca/exports';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ pilotId?: string }>;
}

export default async function PilotTrainingFilePage({ searchParams }: PageProps) {
  const { pilotId } = await searchParams;
  const pilot =
    (pilotId ? DEMO_PILOTS.find((p) => p.id === (pilotId as PilotId)) : DEMO_PILOTS[0]) ??
    DEMO_PILOTS[0]!;
  const operator = DEMO_OPERATORS.find((o) => o.id === pilot.operatorId) ?? DEMO_OPERATORS[0]!;

  const asOfDate = new Date();
  const asOf = asOfDate.toISOString().slice(0, 10) as IsoDate;
  const currencyRecords = buildDemoCurrencyRecords(asOfDate);
  const { sessions, exercises, signOffs, debriefNotes } = buildDemoSessions(asOfDate);

  const data = buildPilotTrainingFile({
    operator,
    pilot,
    currencyRecords,
    sessions,
    exercises,
    signOffs,
    debriefNotes,
    asOf,
    generatedAt: asOfDate,
  });

  return (
    <>
      <PrintStyle />
      <div className="print-root font-sans text-slate-800">
        <PrintToolbar asOf={asOf} pilot={pilot.fullName} />
        <article className="ptf mx-auto max-w-4xl bg-white p-10 print:m-0 print:max-w-none print:p-0">
          <header className="flex items-end justify-between border-b-2 border-amber-500 pb-3">
            <div>
              <h1 className="text-lg font-bold text-navy-900">DN Consultancy Aviation</h1>
              <div className="text-[10px] text-slate-600">
                Flight Crew Training Suite · KCARs 2025-aligned
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold text-navy-900">PILOT TRAINING FILE</div>
              <div className="text-[10px] text-slate-600">As of {asOf}</div>
            </div>
          </header>

          <section className="my-4 grid grid-cols-2 gap-x-6 gap-y-2 rounded bg-slate-100 px-4 py-3 text-[11px]">
            <Meta label="Pilot" value={pilot.fullName} />
            <Meta label="Licence" value={pilot.licenceNumber} />
            <Meta label="Operator" value={data.operator.legalName} />
            <Meta label="AOC No." value={data.operator.aocNumber} />
            <Meta label="Role" value={pilot.role} />
            <Meta label="Base" value={pilot.baseIcao} />
            <Meta label="Training phase" value={pilot.phase.replace(/_/g, ' ')} />
            <Meta
              label="Record summary"
              value={`${data.signedOffSessionCount} signed-off · ${data.draftSessionCount} draft · ${data.totalExercisesGraded} exercises graded · ${data.currencyStatusCounts.CURRENT}/${
                data.currencyStatusCounts.CURRENT +
                data.currencyStatusCounts.CAUTION +
                data.currencyStatusCounts.ACTION +
                data.currencyStatusCounts.EXPIRED
              } currencies current`}
            />
          </section>

          <section className="mb-4 rounded border border-slate-200 p-3 text-[10px] leading-relaxed text-slate-700">
            <strong>Purpose.</strong> This file is the operator's complete training record for the
            named pilot, generated for KCAA inspection or internal Quality Compliance review. It
            holds currency status across the 23-item KCARs/OM-A catalogue, every training session
            ever logged, the per-exercise 8-competency grades (ICAO Doc 9868 PANS-TRG), and every
            instructor sign-off + debrief. Status is computed by{' '}
            <code>@dnca/domain.statusFor()</code> — the same logic that protects the database write
            path.
          </section>

          {/* SECTION 1 — Currency holdings */}
          <Section title="1. Currency holdings">
            <div className="rounded border border-slate-200 bg-slate-50 px-3 py-1 text-[9px] text-slate-600">
              <strong>Item-status summary:</strong> {data.currencyStatusCounts.CURRENT} current ·{' '}
              {data.currencyStatusCounts.CAUTION} caution · {data.currencyStatusCounts.ACTION}{' '}
              action · {data.currencyStatusCounts.EXPIRED} expired ·{' '}
              {data.currencyStatusCounts.NOT_APPLICABLE} N/A
            </div>
            {data.currencyByCategory.map((cb) => (
              <CategoryTable key={cb.category} block={cb} />
            ))}
          </Section>

          {/* SECTION 2 — Session history */}
          <Section title={`2. Session history (${data.sessions.length})`}>
            {data.sessions.length === 0 ? (
              <p className="text-[10px] italic text-slate-500">
                No sessions on file. Once a TRI/TRE logs a session, it appears here.
              </p>
            ) : (
              data.sessions.map((sb) => <SessionBlock key={sb.session.id} block={sb} />)
            )}
          </Section>

          {/* SECTION 3 — Competency profile */}
          <Section
            title={`3. Competency profile — ${data.totalExercisesGraded} exercises × 8 ICAO competencies`}
          >
            <p className="mb-2 text-[10px] text-slate-700">
              Aggregate distribution of grades per ICAO competency across every exercise this pilot
              has been graded on. Cluster patterns guide the next recurrent focus: e.g. a lean
              toward MS on Workload Management would route the next OPC scenario toward task-rate
              management rather than systems revision.
            </p>
            <CompetencyAggregateTable tally={data.competencyAggregate} />
          </Section>

          {/* SECTION 4 — AI assessment history (placeholder) */}
          <Section title="4. AI assessment history">
            <p className="text-[10px] italic text-slate-500">
              Reserved. Persistence of <code>AssessmentResult</code> rows lands in Sprint 4 (depends
              on the API + auth framework decisions). Today's assessments are session-only by design
              — no untracked records, no PII routed to the model.
            </p>
          </Section>

          <footer className="mt-8 border-t border-slate-200 pt-3 text-[9px] text-slate-500">
            <div>
              Generated by DNCA Fokker Training Suite
              {data.generatedByUserName ? ` · ${data.generatedByUserName}` : ''} ·{' '}
              {data.generatedAt.toISOString()}
            </div>
            <div className="mt-1">
              Retention discipline: training records are kept for a minimum of 5 years per KCARs;
              the operator's OM-A may extend this to lifetime-of-licence for selected items. The
              audit log records every change to this pilot's record with actor, timestamp, and
              before/after state.
            </div>
          </footer>
        </article>
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="ptf-section mt-4">
      <h2 className="bg-navy-900 px-2 py-1 text-[11px] font-bold text-white">{title}</h2>
      <div className="mt-1">{children}</div>
    </section>
  );
}

function CategoryTable({ block }: { block: PtfCategoryBlock }) {
  return (
    <div className="mt-2">
      <div className="text-[9px] font-bold uppercase tracking-wide text-slate-600">
        {block.category}
      </div>
      <table className="mt-1 w-full border-collapse text-[10px]">
        <thead>
          <tr className="border-b border-slate-400 bg-slate-100 text-left text-[8px] uppercase tracking-wide text-slate-600">
            <th className="w-[36%] py-1 pl-1">Item</th>
            <th className="w-[28%] py-1">Primary source</th>
            <th className="w-[12%] py-1">Valid from</th>
            <th className="w-[12%] py-1">Valid to</th>
            <th className="w-[12%] py-1 pr-1 text-right">Status</th>
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row) => (
            <CurrencyRow key={row.kind} row={row} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CurrencyRow({ row }: { row: PtfCurrencyRow }) {
  return (
    <tr className="border-b border-slate-200">
      <td className="py-1 pl-1 text-slate-800">{row.label}</td>
      <td className="py-1 text-[9px] text-slate-500">{row.primarySource}</td>
      <td className="py-1 text-[10px] text-slate-700">{row.validFrom ?? '—'}</td>
      <td className="py-1 text-[10px] text-slate-700">{row.validTo ?? '—'}</td>
      <td className="py-1 pr-1 text-right">
        <StatusBadge status={row.status} />
      </td>
    </tr>
  );
}

function StatusBadge({ status }: { status: PtfCurrencyRow['status'] }) {
  const map: Record<PtfCurrencyRow['status'], { label: string; cls: string }> = {
    CURRENT: { label: 'Current', cls: 'bg-emerald-100 text-emerald-800' },
    CAUTION: { label: 'Caution', cls: 'bg-amber-100 text-amber-800' },
    ACTION: { label: 'Action', cls: 'bg-red-100 text-red-800' },
    EXPIRED: { label: 'Expired', cls: 'bg-red-600 text-white' },
    NOT_APPLICABLE: { label: 'N/A', cls: 'bg-slate-200 text-slate-600' },
  };
  const m = map[status];
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-[8px] font-bold ${m.cls}`}>
      {m.label}
    </span>
  );
}

function SessionBlock({ block }: { block: PtfSessionBlock }) {
  const { session, exercises, signOff, debriefNote } = block;
  return (
    <div className="ptf-session mt-2 rounded border border-slate-200 px-3 py-2">
      <div className="flex items-baseline justify-between">
        <div className="text-[10px] font-bold text-navy-900">
          {humanSessionKind(session.kind)} — {session.startedAt.slice(0, 10)}
        </div>
        <div className="flex items-center gap-2 text-[9px] text-slate-600">
          <span>{session.venue}</span>
          {session.ffsDesignation ? <span>· {session.ffsDesignation}</span> : null}
          <SessionStatusBadge status={session.status} />
          {session.overallGrade ? <GradeChip grade={session.overallGrade} /> : null}
        </div>
      </div>

      {signOff ? (
        <div className="mt-1 text-[9px] text-emerald-900">
          <strong>Signed-off ({signOff.signedByRole}):</strong> {signOff.statement}
        </div>
      ) : (
        <div className="mt-1 text-[9px] italic text-amber-800">No sign-off recorded.</div>
      )}

      {debriefNote ? (
        <div className="mt-1 whitespace-pre-line text-[9px] text-slate-700">
          <strong>Debrief:</strong> {debriefNote.body}
        </div>
      ) : null}

      {exercises.length > 0 ? (
        <table className="mt-2 w-full border-collapse text-[9px]">
          <thead>
            <tr className="border-b border-slate-300 text-left text-[8px] uppercase tracking-wide text-slate-500">
              <th className="py-0.5 pl-1">#</th>
              <th className="py-0.5">Exercise</th>
              {ICAO_COMPETENCY.map((c) => (
                <th key={c} className="py-0.5 text-center" title={COMPETENCY_LABEL[c]}>
                  {shortCompetencyLabel(c)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {exercises.map((ex) => (
              <tr key={ex.id} className="border-b border-slate-200">
                <td className="py-0.5 pl-1 text-slate-500">{ex.ordinal}</td>
                <td className="py-0.5">
                  <div className="text-slate-800">{ex.title}</div>
                  <div className="text-[8px] text-slate-500">{ex.reference}</div>
                </td>
                {ICAO_COMPETENCY.map((competency) => {
                  const cg = ex.competencyGrades.find((g) => g.competency === competency);
                  return (
                    <td key={competency} className="py-0.5 text-center">
                      <CompetencyCellGrade grade={cg?.grade} />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  );
}

function CompetencyCellGrade({ grade }: { grade: Grade | undefined }) {
  if (!grade) return <span className="text-slate-300">—</span>;
  if (grade.scale === 'NOT_OBSERVED') {
    return <span className="rounded bg-slate-100 px-1 py-0.5 text-[7px] text-slate-500">N/O</span>;
  }
  const value = String(grade.value);
  const cls =
    value === 'AS'
      ? 'bg-emerald-200 text-emerald-900'
      : value === 'S'
        ? 'bg-emerald-50 text-emerald-800'
        : value === 'MS'
          ? 'bg-amber-100 text-amber-900'
          : value === 'BS'
            ? 'bg-red-100 text-red-900'
            : 'bg-slate-100 text-slate-700';
  return <span className={`rounded px-1 py-0.5 text-[7px] font-bold ${cls}`}>{value}</span>;
}

function CompetencyAggregateTable({ tally }: { tally: CompetencyTally }) {
  return (
    <table className="mt-1 w-full border-collapse text-[10px]">
      <thead>
        <tr className="border-b border-slate-400 bg-slate-100 text-[8px] uppercase tracking-wide text-slate-600">
          <th className="py-1 pl-1 text-left">Competency</th>
          <th className="py-1 text-right">AS</th>
          <th className="py-1 text-right">S</th>
          <th className="py-1 text-right">MS</th>
          <th className="py-1 text-right">BS</th>
          <th className="py-1 pr-1 text-right">N/O</th>
        </tr>
      </thead>
      <tbody>
        {ICAO_COMPETENCY.map((c) => {
          const row = tally[c];
          return (
            <tr key={c} className="border-b border-slate-200">
              <td className="py-1 pl-1 text-slate-800">{COMPETENCY_LABEL[c]}</td>
              <td className="py-1 text-right tabular-nums">{cell(row.AS, 'AS')}</td>
              <td className="py-1 text-right tabular-nums">{cell(row.S, 'S')}</td>
              <td className="py-1 text-right tabular-nums">{cell(row.MS, 'MS')}</td>
              <td className="py-1 text-right tabular-nums">{cell(row.BS, 'BS')}</td>
              <td className="py-1 pr-1 text-right tabular-nums text-slate-500">
                {row.NOT_OBSERVED || ''}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function cell(n: number, value: string): React.ReactNode {
  if (n === 0) return '';
  const cls =
    value === 'AS'
      ? 'bg-emerald-100 text-emerald-900'
      : value === 'S'
        ? 'bg-emerald-50 text-emerald-800'
        : value === 'MS'
          ? 'bg-amber-50 text-amber-900'
          : value === 'BS'
            ? 'bg-red-100 text-red-900'
            : 'bg-slate-50 text-slate-700';
  return <span className={`inline-block rounded px-2 py-0.5 ${cls}`}>{n}</span>;
}

function shortCompetencyLabel(c: IcaoCompetency): string {
  const map: Record<IcaoCompetency, string> = {
    APPLICATION_OF_PROCEDURES: 'Proc',
    COMMUNICATION: 'Comm',
    FLIGHT_PATH_AUTOMATION: 'FP-A',
    FLIGHT_PATH_MANUAL: 'FP-M',
    LEADERSHIP_TEAMWORK: 'Lead',
    PROBLEM_SOLVING_DECISION_MAKING: 'Prob',
    SITUATION_AWARENESS: 'SA',
    WORKLOAD_MANAGEMENT: 'WL',
  };
  return map[c];
}

function SessionStatusBadge({
  status,
}: {
  status: 'DRAFT' | 'COMPLETED' | 'SIGNED_OFF' | 'VOIDED';
}) {
  const map: Record<typeof status, string> = {
    DRAFT: 'bg-slate-100 text-slate-700',
    COMPLETED: 'bg-blue-100 text-blue-800',
    SIGNED_OFF: 'bg-emerald-100 text-emerald-800',
    VOIDED: 'bg-red-100 text-red-800',
  };
  return (
    <span className={`rounded px-1.5 py-0.5 text-[8px] font-bold ${map[status]}`}>
      {status.replace(/_/g, ' ').toLowerCase()}
    </span>
  );
}

function GradeChip({ grade }: { grade: Grade }) {
  if (grade.scale === 'NOT_OBSERVED') return null;
  const value = String(grade.value);
  const cls =
    value === 'AS'
      ? 'bg-emerald-600 text-white'
      : value === 'S'
        ? 'bg-emerald-100 text-emerald-800'
        : value === 'MS'
          ? 'bg-amber-100 text-amber-800'
          : 'bg-red-600 text-white';
  return <span className={`rounded px-2 py-0.5 text-[8px] font-bold ${cls}`}>{value}</span>;
}

function humanSessionKind(k: string): string {
  return k
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function PrintToolbar({ asOf, pilot }: { asOf: IsoDate; pilot: string }) {
  return (
    <div className="no-print sticky top-0 z-10 border-b border-slate-200 bg-amber-50 px-4 py-2 text-xs">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
        <div className="text-amber-900">
          <strong>{pilot}</strong> — {asOf}. Use <kbd className="rounded bg-amber-200 px-1">⌘P</kbd>
          /<kbd className="rounded bg-amber-200 px-1">Ctrl+P</kbd> to save as PDF. Margins:{' '}
          <em>narrow</em>; layout: <em>portrait</em>; scale: <em>100%</em>.
        </div>
        <div className="flex flex-wrap gap-2">
          {DEMO_PILOTS.map((p) => (
            <a
              key={p.id}
              href={`?pilotId=${p.id}`}
              className="rounded border border-amber-300 bg-white px-2 py-1 text-[10px] text-amber-900 hover:bg-amber-100"
            >
              {p.fullName}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[8px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className="font-bold text-navy-900">{value}</div>
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
  .ptf-session { break-inside: avoid; }
  .ptf-section { break-inside: auto; }
  @page {
    size: A4 portrait;
    margin: 10mm 12mm;
  }
}
        `,
      }}
    />
  );
}
