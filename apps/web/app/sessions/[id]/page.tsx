import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  COMPETENCY_LABEL,
  DEMO_OPERATORS,
  DEMO_PILOTS,
  ICAO_COMPETENCY,
  buildDemoSessions,
  lookupInstructorName,
  tallyCompetencies,
  type CompetencyGrade,
  type Exercise,
  type Grade,
  type IcaoCompetency,
} from '@dnca/domain';
import { ArrowLeft, CheckCircle, FileText, MessageSquare } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function SessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const asOf = new Date();
  const { sessions, exercises, signOffs, debriefNotes } = buildDemoSessions(asOf);
  const session = sessions.find((s) => s.id === id);
  if (!session) notFound();

  const sessionExercises = exercises
    .filter((e) => e.sessionId === session.id)
    .sort((a, b) => a.ordinal - b.ordinal);
  const signOff = signOffs.find((so) => so.sessionId === session.id);
  const debrief = debriefNotes.find((d) => d.sessionId === session.id);
  const pilot = DEMO_PILOTS.find((p) => p.id === session.pilotId);
  const operator = DEMO_OPERATORS.find((o) => o.id === session.operatorId);
  const tally = tallyCompetencies(sessionExercises);

  return (
    <div className="space-y-6">
      <Link
        href="/sessions"
        className="inline-flex items-center gap-1 text-sm text-navy-700 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        All sessions
      </Link>

      <header className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-navy-900">
              {pilot ? (
                <Link href={`/pilots/${encodeURIComponent(pilot.id)}`} className="hover:underline">
                  {pilot.fullName}
                </Link>
              ) : (
                'Unknown pilot'
              )}
            </h1>
            <p className="text-xs text-slate-600">
              {operator?.tradingName} · {pilot?.role} · {pilot?.licenceNumber}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
              <Field label="Session" value={humanSessionKind(session.kind)} />
              <Field
                label="Venue"
                value={
                  session.venue + (session.ffsDesignation ? ` · ${session.ffsDesignation}` : '')
                }
              />
              <Field label="Instructor" value={lookupInstructorName(session.instructorUserId)} />
              <Field label="Date" value={session.startedAt.slice(0, 10)} />
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <StatusBadge status={session.status} />
            {session.overallGrade ? <OverallGradeChip grade={session.overallGrade} /> : null}
          </div>
        </div>
      </header>

      {signOff ? (
        <section className="rounded-lg border border-emerald-300 bg-emerald-50 p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-emerald-900">
            <CheckCircle className="h-4 w-4" />
            Sign-off — {signOff.signedByRole}
          </h2>
          <p className="mt-2 text-sm text-emerald-900">{signOff.statement}</p>
          <p className="mt-2 text-[11px] text-emerald-700">
            Signed by {lookupInstructorName(signOff.signedByUserId)} at {signOff.signedAt}
          </p>
        </section>
      ) : (
        <section className="rounded-lg border border-amber-300 bg-amber-50 p-5 text-sm text-amber-900">
          This session is in <strong>{session.status}</strong>. No sign-off has been recorded.
        </section>
      )}

      {debrief ? (
        <section className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-navy-900">
            <MessageSquare className="h-4 w-4 text-navy-700" />
            Debrief
          </h2>
          <p className="mt-2 whitespace-pre-line text-sm text-slate-700">{debrief.body}</p>
          <p className="mt-2 text-[11px] text-slate-500">
            By {lookupInstructorName(debrief.authoredByUserId)} at {debrief.createdAt}
          </p>
        </section>
      ) : null}

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
          Exercises ({sessionExercises.length})
        </h2>
        {sessionExercises.map((ex) => (
          <ExercisePanel key={ex.id} exercise={ex} />
        ))}
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <header className="bg-navy-900 px-5 py-3 text-white">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <FileText className="h-4 w-4 text-amber-500" />
            Aggregate — 8-competency tally across {sessionExercises.length} exercises
          </h2>
        </header>
        <table className="w-full text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Competency</th>
              <th className="px-3 py-2 text-right font-medium">AS</th>
              <th className="px-3 py-2 text-right font-medium">S</th>
              <th className="px-3 py-2 text-right font-medium">MS</th>
              <th className="px-3 py-2 text-right font-medium">BS</th>
              <th className="px-3 py-2 text-right font-medium">Not Observed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {ICAO_COMPETENCY.map((c) => {
              const row = tally[c];
              return (
                <tr key={c} className="hover:bg-slate-50">
                  <td className="px-3 py-2 text-slate-800">{COMPETENCY_LABEL[c]}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{cell(row.AS, 'AS')}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{cell(row.S, 'S')}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{cell(row.MS, 'MS')}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{cell(row.BS, 'BS')}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-500">
                    {row.NOT_OBSERVED || ''}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function ExercisePanel({ exercise }: { exercise: Exercise }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold text-navy-900">
          {exercise.ordinal}. {exercise.title}
        </h3>
        <span className="text-[11px] text-slate-500">{exercise.reference}</span>
      </div>
      {exercise.observableBehaviours && exercise.observableBehaviours.length > 0 ? (
        <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-slate-700">
          {exercise.observableBehaviours.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      ) : null}
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {exercise.competencyGrades.map((cg) => (
          <CompetencyPill key={cg.competency} cg={cg} />
        ))}
      </div>
      {exercise.debriefNote ? (
        <p className="mt-3 rounded bg-amber-50 p-3 text-xs text-amber-900">
          <strong>Note:</strong> {exercise.debriefNote}
        </p>
      ) : null}
    </article>
  );
}

function CompetencyPill({ cg }: { cg: CompetencyGrade }) {
  const label = COMPETENCY_LABEL[cg.competency];
  const isObserved = cg.grade.scale !== 'NOT_OBSERVED';
  const valueText = cg.grade.scale === 'NOT_OBSERVED' ? 'N/O' : String(cg.grade.value);
  const colour =
    cg.grade.scale === 'NOT_OBSERVED'
      ? 'bg-slate-100 text-slate-500'
      : gradeColour(String(cg.grade.value));
  const tooltip =
    cg.grade.scale === 'NOT_OBSERVED'
      ? `Not observed — ${cg.grade.reason}`
      : `${label}: ${valueText}`;
  return (
    <div
      className={`flex items-center justify-between rounded px-2 py-1 text-[11px] ${colour}`}
      title={tooltip}
    >
      <span className="truncate pr-2" title={label}>
        {shortCompetencyLabel(cg.competency)}
      </span>
      <span
        className={`shrink-0 rounded px-1 py-0.5 text-[10px] font-bold ${isObserved ? 'bg-white/40' : ''}`}
      >
        {valueText}
      </span>
    </div>
  );
}

function shortCompetencyLabel(c: IcaoCompetency): string {
  const map: Record<IcaoCompetency, string> = {
    APPLICATION_OF_PROCEDURES: 'Procedures',
    COMMUNICATION: 'Communication',
    FLIGHT_PATH_AUTOMATION: 'FP Automation',
    FLIGHT_PATH_MANUAL: 'FP Manual',
    LEADERSHIP_TEAMWORK: 'Leadership/Team',
    PROBLEM_SOLVING_DECISION_MAKING: 'Problem Solving',
    SITUATION_AWARENESS: 'Sit. Awareness',
    WORKLOAD_MANAGEMENT: 'Workload',
  };
  return map[c];
}

function gradeColour(value: string): string {
  return (
    {
      AS: 'bg-emerald-100 text-emerald-900 border border-emerald-300',
      S: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
      MS: 'bg-amber-50 text-amber-900 border border-amber-200',
      BS: 'bg-red-100 text-red-900 border border-red-300',
    }[value] ?? 'bg-slate-50 text-slate-700'
  );
}

function cell(n: number, value: string): string | React.ReactNode {
  if (n === 0) return '';
  const colour = gradeColour(value);
  return <span className={`inline-block rounded px-2 py-0.5 ${colour}`}>{n}</span>;
}

function StatusBadge({ status }: { status: 'DRAFT' | 'COMPLETED' | 'SIGNED_OFF' | 'VOIDED' }) {
  const styles: Record<typeof status, string> = {
    DRAFT: 'bg-slate-100 text-slate-700 border border-slate-300',
    COMPLETED: 'bg-blue-100 text-blue-800 border border-blue-300',
    SIGNED_OFF: 'bg-emerald-100 text-emerald-800 border border-emerald-300',
    VOIDED: 'bg-red-100 text-red-800 border border-red-300',
  };
  return (
    <span className={`rounded px-2 py-1 text-[10px] ${styles[status]}`}>
      {status
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase())}
    </span>
  );
}

function OverallGradeChip({ grade }: { grade: Grade }) {
  if (grade.scale === 'NOT_OBSERVED') return null;
  const value = String(grade.value);
  return (
    <span className={`rounded px-3 py-1 text-xs font-bold ${gradeColour(value)}`}>
      Overall: {value}
    </span>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className="text-sm font-medium text-navy-900">{value}</div>
    </div>
  );
}

function humanSessionKind(k: string): string {
  return k
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
