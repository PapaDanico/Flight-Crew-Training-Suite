import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle,
  ClipboardList,
  Download,
  Edit2,
  Plane,
  ShieldCheck,
} from 'lucide-react';
import {
  CURRENCY_CATALOG,
  CURRENCY_CATEGORY,
  DEMO_OPERATORS,
  DEMO_PILOTS,
  buildDemoCurrencyRecords,
  buildDemoSessions,
  currencyMapKey,
  indexCurrencyByPilotAndKind,
  lookupCurrency,
  lookupInstructorName,
  statusFor,
  type CurrencyRecord,
  type CurrencyStatus,
  type Grade,
  type IsoDate,
  type Pilot,
  type PilotId,
} from '@dnca/domain';
import { ApiError, getPilot, listCurrencyRecords } from '@/lib/api-client';
import { isApiConfigured } from '@/lib/api-config';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

async function loadPilot(
  id: string,
): Promise<{ pilot: Pilot; records: ReadonlyArray<CurrencyRecord>; source: 'api' | 'fixtures' }> {
  if (isApiConfigured()) {
    try {
      const apiPilot = await getPilot(id);
      const { records } = await listCurrencyRecords(id);
      // The API returns the same shapes @dnca/domain types describe; cast
      // through unknown to satisfy branded-type opacity at the boundary.
      const pilot = {
        ...apiPilot,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as unknown as Pilot;
      return {
        pilot,
        records: records as unknown as ReadonlyArray<CurrencyRecord>,
        source: 'api',
      };
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) notFound();
      // Other errors fall through to fixtures so the demo stays usable.
    }
  }
  const fixturePilot = DEMO_PILOTS.find((p) => p.id === (id as PilotId));
  if (!fixturePilot) notFound();
  const records = buildDemoCurrencyRecords(new Date()).filter((r) => r.pilotId === fixturePilot.id);
  return { pilot: fixturePilot, records, source: 'fixtures' };
}

export default async function PilotDetailPage({ params }: PageProps) {
  const { id } = await params;
  const { pilot, records, source } = await loadPilot(id);

  const operator = DEMO_OPERATORS.find((o) => o.id === pilot.operatorId);
  const asOf = new Date();
  const asOfIso = asOf.toISOString().slice(0, 10) as IsoDate;
  const recordIndex = indexCurrencyByPilotAndKind(records);
  // Sessions remain fixture-only for now — the GET /sessions list endpoint
  // is the next API task (currently we only have GET /sessions/:id).
  const { sessions } = buildDemoSessions(asOf);
  const pilotSessions = sessions
    .filter((s) => s.pilotId === pilot.id)
    .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));

  // Per-pilot status tally across the catalog.
  const statusCounts: Record<CurrencyStatus, number> = {
    CURRENT: 0,
    CAUTION: 0,
    ACTION: 0,
    EXPIRED: 0,
    NOT_APPLICABLE: 0,
  };
  for (const c of CURRENCY_CATALOG) {
    const rec = recordIndex.get(currencyMapKey(pilot.id, c.kind));
    const status = statusFor({
      kind: c.kind,
      phase: pilot.phase,
      validTo: rec?.validTo,
      asOf: asOfIso,
    });
    statusCounts[status] += 1;
  }

  return (
    <div className="space-y-6">
      <Link
        href="/pilots"
        className="inline-flex items-center gap-1 text-sm text-navy-700 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        All pilots
      </Link>

      <header className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-navy-900">{pilot.fullName}</h1>
            <p className="mt-1 text-xs text-slate-600">
              {operator?.tradingName} · {pilot.role} · {pilot.licenceNumber}
            </p>
            <p className="mt-1 text-[10px] text-slate-500">
              Source:{' '}
              <span
                className={
                  source === 'api'
                    ? 'font-semibold text-emerald-700'
                    : 'font-semibold text-amber-700'
                }
              >
                {source === 'api' ? 'live API' : 'fixtures (API not configured)'}
              </span>
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
              <Meta label="Operator" value={operator?.tradingName ?? '—'} />
              <Meta label="Base" value={pilot.baseIcao} />
              <Meta label="Phase" value={pilot.phase.replace(/_/g, ' ')} />
              <Meta label="As of" value={asOfIso} />
            </div>
          </div>
          <div className="flex shrink-0 flex-col gap-2">
            <a
              href={`/exports/pilot-training-file?pilotId=${pilot.id}`}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-2 rounded border border-amber-500 bg-amber-500 px-3 py-2 text-xs font-medium text-navy-900 hover:bg-amber-400"
            >
              <Download className="h-3.5 w-3.5" />
              Pilot Training File
            </a>
            <a
              href={`/exports/crew-currency-snapshot?operatorId=${pilot.operatorId}`}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-2 rounded border border-navy-300 bg-white px-3 py-2 text-xs font-medium text-navy-900 hover:bg-navy-50"
            >
              <Download className="h-3.5 w-3.5" />
              Operator snapshot
            </a>
            <span className="text-[10px] text-slate-500">
              Cmd-P from either view → Save as PDF.
            </span>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat
          icon={<CheckCircle className="h-4 w-4" />}
          label="Current"
          value={statusCounts.CURRENT}
          tone="emerald"
        />
        <Stat
          icon={<CalendarClock className="h-4 w-4" />}
          label="Caution"
          value={statusCounts.CAUTION}
          tone="amber"
        />
        <Stat
          icon={<CalendarClock className="h-4 w-4" />}
          label="Action"
          value={statusCounts.ACTION}
          tone="red"
        />
        <Stat
          icon={<ShieldCheck className="h-4 w-4" />}
          label="Expired"
          value={statusCounts.EXPIRED}
          tone="red"
        />
        <Stat
          icon={<ClipboardList className="h-4 w-4" />}
          label="Sessions"
          value={pilotSessions.length}
          tone="navy"
        />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">
          Currency by category
        </h2>
        <div className="space-y-3">
          {CURRENCY_CATEGORY.map((cat) => {
            const catCurrencies = CURRENCY_CATALOG.filter((c) => c.category === cat);
            return (
              <div
                key={cat}
                className="overflow-hidden rounded-lg border border-slate-200 bg-white"
              >
                <header className="bg-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-700">
                  {cat}
                </header>
                <table className="w-full text-sm">
                  <thead className="bg-white text-[10px] uppercase tracking-wide text-slate-500">
                    <tr className="border-b border-slate-200">
                      <th className="px-3 py-1 text-left font-medium">Currency</th>
                      <th className="px-3 py-1 text-left font-medium">Source</th>
                      <th className="px-3 py-1 text-left font-medium">Valid from</th>
                      <th className="px-3 py-1 text-left font-medium">Valid to</th>
                      <th className="px-3 py-1 text-right font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {catCurrencies.map((c) => {
                      const rec = recordIndex.get(currencyMapKey(pilot.id, c.kind));
                      const status = statusFor({
                        kind: c.kind,
                        phase: pilot.phase,
                        validTo: rec?.validTo,
                        asOf: asOfIso,
                      });
                      const entry = lookupCurrency(c.kind);
                      return (
                        <tr key={c.kind} className="hover:bg-slate-50">
                          <td className="px-3 py-1.5">
                            <div className="font-medium text-slate-800">{entry.label}</div>
                            <div className="text-[10px] text-slate-500">{entry.primarySource}</div>
                          </td>
                          <td className="px-3 py-1.5 text-[11px] text-slate-600">
                            {entry.cycle.kind === 'months'
                              ? `${entry.cycle.months}-month cycle`
                              : entry.cycle.kind === 'days-rolling'
                                ? `${entry.cycle.days}-day rolling`
                                : entry.cycle.description}
                          </td>
                          <td className="px-3 py-1.5 text-[11px] text-slate-600">
                            {rec?.validFrom ?? '—'}
                          </td>
                          <td className="px-3 py-1.5 text-[11px] text-slate-600">
                            {rec?.validTo ?? '—'}
                          </td>
                          <td className="px-3 py-1.5 text-right">
                            <StatusBadge status={status} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">
          Recent sessions ({pilotSessions.length})
        </h2>
        {pilotSessions.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500">
            No sessions on file. Once a TRI/TRE logs a session, it appears here with per-exercise
            CBTA grading.
          </div>
        ) : (
          <ul className="space-y-2">
            {pilotSessions.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/sessions/${encodeURIComponent(s.id)}`}
                  className="block rounded-lg border border-slate-200 bg-white p-3 transition hover:border-navy-700 hover:shadow"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-navy-900">
                        {humanSessionKind(s.kind)}
                      </div>
                      <div className="text-[11px] text-slate-600">
                        {s.venue}
                        {s.ffsDesignation ? ` · ${s.ffsDesignation}` : ''} ·{' '}
                        {lookupInstructorName(s.instructorUserId)} · {s.startedAt.slice(0, 10)}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {s.overallGrade ? <GradeChip grade={s.overallGrade} /> : null}
                      <SessionStatusBadge status={s.status} />
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-xs text-slate-600">
        <div className="flex items-center gap-2 font-semibold text-slate-700">
          <Plane className="h-3.5 w-3.5" />
          Coming in later sprints
        </div>
        <ul className="mt-2 list-disc pl-5 space-y-1">
          <li>
            Assessment history — Sprint 4 wires{' '}
            <code className="rounded bg-white px-1">AssessmentResult</code> persistence; today's
            assessments are session-only by design (no PII to the model, no untracked records).
          </li>
          <li>
            Edit / sign-off actions — API write paths exist (POST /pilots, PATCH /pilots/:id, POST
            /sessions/:id/sign-off) with AuditEvent emission and operator-scope RLS; the UI
            affordances land once WorkOS JWT verification flips on (Sprint 3 follow-on).
          </li>
        </ul>
      </section>
    </div>
  );
}

function humanSessionKind(k: string): string {
  return k
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function StatusBadge({ status }: { status: CurrencyStatus }) {
  const map: Record<CurrencyStatus, { label: string; cls: string }> = {
    CURRENT: { label: 'Current', cls: 'bg-emerald-100 text-emerald-800 border border-emerald-300' },
    CAUTION: { label: 'Caution', cls: 'bg-amber-100 text-amber-800 border border-amber-300' },
    ACTION: { label: 'Action', cls: 'bg-red-100 text-red-800 border border-red-300' },
    EXPIRED: { label: 'Expired', cls: 'bg-red-600 text-white' },
    NOT_APPLICABLE: { label: 'N/A', cls: 'bg-slate-200 text-slate-600' },
  };
  const s = map[status];
  return <span className={`rounded px-2 py-0.5 text-[10px] ${s.cls}`}>{s.label}</span>;
}

function SessionStatusBadge({
  status,
}: {
  status: 'DRAFT' | 'COMPLETED' | 'SIGNED_OFF' | 'VOIDED';
}) {
  const map: Record<typeof status, { label: string; cls: string; icon: React.ReactNode | null }> = {
    DRAFT: {
      label: 'Draft',
      cls: 'bg-slate-100 text-slate-700 border border-slate-300',
      icon: <Edit2 className="h-3 w-3" />,
    },
    COMPLETED: {
      label: 'Completed',
      cls: 'bg-blue-100 text-blue-800 border border-blue-300',
      icon: null,
    },
    SIGNED_OFF: {
      label: 'Signed off',
      cls: 'bg-emerald-100 text-emerald-800 border border-emerald-300',
      icon: <CheckCircle className="h-3 w-3" />,
    },
    VOIDED: {
      label: 'Voided',
      cls: 'bg-red-100 text-red-800 border border-red-300',
      icon: null,
    },
  };
  const s = map[status];
  return (
    <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] ${s.cls}`}>
      {s.icon}
      {s.label}
    </span>
  );
}

function GradeChip({ grade }: { grade: Grade }) {
  if (grade.scale === 'NOT_OBSERVED') return null;
  const value = String(grade.value);
  const map: Record<string, string> = {
    AS: 'bg-emerald-600 text-white',
    S: 'bg-emerald-100 text-emerald-800 border border-emerald-300',
    MS: 'bg-amber-100 text-amber-800 border border-amber-300',
    BS: 'bg-red-600 text-white',
  };
  const cls = map[value] ?? 'bg-slate-200 text-slate-800';
  return <span className={`rounded px-2 py-0.5 text-[10px] font-semibold ${cls}`}>{value}</span>;
}

function Stat({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: 'emerald' | 'amber' | 'red' | 'navy';
}) {
  const bg = {
    emerald: 'bg-emerald-600',
    amber: 'bg-amber-500',
    red: 'bg-red-600',
    navy: 'bg-navy-900',
  }[tone];
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3">
      <div className={`flex h-9 w-9 items-center justify-center rounded text-white ${bg}`}>
        {icon}
      </div>
      <div>
        <div className="text-xl font-bold text-navy-900 tabular-nums">{value}</div>
        <div className="text-[10px] text-slate-500">{label}</div>
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className="text-sm font-medium text-navy-900">{value}</div>
    </div>
  );
}
