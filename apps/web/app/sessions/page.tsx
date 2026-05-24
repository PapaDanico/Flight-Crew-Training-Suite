import Link from 'next/link';
import {
  DEMO_OPERATORS,
  DEMO_PILOTS,
  buildDemoSessions,
  lookupInstructorName,
  type Grade,
} from '@dnca/domain';
import { CheckCircle, Clock, Edit2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function SessionsListPage() {
  const asOf = new Date();
  const { sessions } = buildDemoSessions(asOf);
  const pilotsById = new Map(DEMO_PILOTS.map((p) => [p.id, p]));
  const operatorsById = new Map(DEMO_OPERATORS.map((o) => [o.id, o]));

  const ordered = [...sessions].sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-navy-900">Training Sessions</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-700">
          Per-exercise 8-competency CBTA grading per ICAO Doc 9868 PANS-TRG. Replaces the
          prototype's single-competency regex mapping with the production data model (Phase-0 audit
          §4.1). Currently rendering deterministic demo data — same shape the backend write path
          will produce.
        </p>
      </header>

      <ul className="space-y-3">
        {ordered.map((s) => {
          const pilot = pilotsById.get(s.pilotId);
          const operator = operatorsById.get(s.operatorId);
          return (
            <li key={s.id}>
              <Link
                href={`/sessions/${encodeURIComponent(s.id)}`}
                className="block rounded-lg border border-slate-200 bg-white p-4 transition hover:border-navy-700 hover:shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-semibold text-navy-900">{pilot?.fullName}</span>
                      <span className="text-xs text-slate-500">
                        {operator?.tradingName ?? '—'} · {pilot?.role}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-slate-700">
                      <span className="font-medium">{humanSessionKind(s.kind)}</span>
                      <span className="mx-2 text-slate-400">·</span>
                      <span>{s.venue}</span>
                      {s.ffsDesignation ? (
                        <>
                          <span className="mx-2 text-slate-400">·</span>
                          <span>{s.ffsDesignation}</span>
                        </>
                      ) : null}
                      <span className="mx-2 text-slate-400">·</span>
                      <span>{lookupInstructorName(s.instructorUserId)}</span>
                    </div>
                    <div className="mt-1 text-[10px] uppercase tracking-wide text-slate-400">
                      {s.startedAt.slice(0, 10)}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {s.overallGrade ? <GradeChip grade={s.overallGrade} /> : null}
                    <StatusBadge status={s.status} />
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function humanSessionKind(k: string): string {
  return k
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function StatusBadge({ status }: { status: 'DRAFT' | 'COMPLETED' | 'SIGNED_OFF' | 'VOIDED' }) {
  const styles: Record<typeof status, { bg: string; icon: React.ReactNode; label: string }> = {
    DRAFT: {
      bg: 'bg-slate-100 text-slate-700 border border-slate-300',
      icon: <Edit2 className="h-3 w-3" />,
      label: 'Draft',
    },
    COMPLETED: {
      bg: 'bg-blue-100 text-blue-800 border border-blue-300',
      icon: <Clock className="h-3 w-3" />,
      label: 'Completed',
    },
    SIGNED_OFF: {
      bg: 'bg-emerald-100 text-emerald-800 border border-emerald-300',
      icon: <CheckCircle className="h-3 w-3" />,
      label: 'Signed off',
    },
    VOIDED: { bg: 'bg-red-100 text-red-800 border border-red-300', icon: null, label: 'Voided' },
  };
  const s = styles[status];
  return (
    <span className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[10px] ${s.bg}`}>
      {s.icon}
      {s.label}
    </span>
  );
}

function GradeChip({ grade }: { grade: Grade }) {
  if (grade.scale === 'NOT_OBSERVED') return null;
  const value = String(grade.value);
  const styles: Record<string, string> = {
    AS: 'bg-emerald-600 text-white',
    S: 'bg-emerald-100 text-emerald-800 border border-emerald-300',
    MS: 'bg-amber-100 text-amber-800 border border-amber-300',
    BS: 'bg-red-600 text-white',
  };
  const cls = styles[value] ?? 'bg-slate-200 text-slate-800';
  return (
    <span className={`inline-flex items-center rounded px-2 py-1 text-[10px] font-semibold ${cls}`}>
      {value}
    </span>
  );
}
