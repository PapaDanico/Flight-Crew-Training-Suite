import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Plane,
  TrendingUp,
  Users,
} from 'lucide-react';
import {
  CURRENCY_CATALOG,
  CURRENCY_STATUS,
  DEMO_OPERATORS,
  DEMO_PILOTS,
  TRAINING_PHASE,
  buildDemoCurrencyRecords,
  currencyMapKey,
  daysBetween,
  indexCurrencyByPilotAndKind,
  lookupCurrency,
  statusFor,
  type CurrencyStatus,
  type IsoDate,
  type TrainingPhase,
} from '@dnca/domain';
import { KCARS_2025_INSTRUMENTS, REG_84_UNEXTENDED_DEADLINE } from '@dnca/ontology';

export const dynamic = 'force-dynamic';

export default function DashboardPage() {
  const asOf = new Date();
  const asOfIso = asOf.toISOString().slice(0, 10) as IsoDate;
  const records = buildDemoCurrencyRecords(asOf);
  const index = indexCurrencyByPilotAndKind(records);

  // Item-level status counts across every (pilot, currency) cell. Item-level is
  // more correct than the prototype's pilot-level rollup (Phase-0 audit §2.5).
  const itemStatusCounts: Record<CurrencyStatus, number> = {
    CURRENT: 0,
    CAUTION: 0,
    ACTION: 0,
    EXPIRED: 0,
    NOT_APPLICABLE: 0,
  };
  const operatorPilotCounts = new Map<string, number>(DEMO_OPERATORS.map((o) => [o.id, 0]));
  const phasePilotCounts = new Map<TrainingPhase, number>(TRAINING_PHASE.map((p) => [p, 0]));

  type ExpiringRow = {
    pilotName: string;
    operatorShort: string;
    currencyLabel: string;
    validTo: IsoDate;
    status: CurrencyStatus;
    daysToExpiry: number;
  };
  const expiringSoon: ExpiringRow[] = [];

  for (const pilot of DEMO_PILOTS) {
    operatorPilotCounts.set(pilot.operatorId, (operatorPilotCounts.get(pilot.operatorId) ?? 0) + 1);
    phasePilotCounts.set(pilot.phase, (phasePilotCounts.get(pilot.phase) ?? 0) + 1);
    for (const c of CURRENCY_CATALOG) {
      const rec = index.get(currencyMapKey(pilot.id, c.kind));
      const status = statusFor({
        kind: c.kind,
        phase: pilot.phase,
        validTo: rec?.validTo,
        asOf: asOfIso,
      });
      itemStatusCounts[status] += 1;

      if (
        rec !== undefined &&
        (status === 'CAUTION' || status === 'ACTION' || status === 'EXPIRED')
      ) {
        const operator = DEMO_OPERATORS.find((o) => o.id === pilot.operatorId);
        expiringSoon.push({
          pilotName: pilot.fullName,
          operatorShort: operator?.tradingName ?? '—',
          currencyLabel: lookupCurrency(c.kind).label,
          validTo: rec.validTo,
          status,
          daysToExpiry: daysBetween(asOfIso, rec.validTo),
        });
      }
    }
  }
  expiringSoon.sort((a, b) => a.daysToExpiry - b.daysToExpiry);

  const ln42 = KCARS_2025_INSTRUMENTS.find((i) => i.instrumentId === 'LN-42-2026');
  const totalPilots = DEMO_PILOTS.length;
  const totalItems = totalPilots * CURRENCY_CATALOG.length;
  const operatorRows = DEMO_OPERATORS.map((o) => ({
    label: o.tradingName,
    value: operatorPilotCounts.get(o.id) ?? 0,
  }));
  const phaseRows = TRAINING_PHASE.map((p) => ({
    label: p.replace(/_/g, ' '),
    value: phasePilotCounts.get(p) ?? 0,
  })).filter((r) => r.value > 0);

  return (
    <div className="space-y-8">
      <section className="rounded-lg border border-amber-300 bg-amber-50 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-amber-900">
          Regulatory cliff visibility
        </h2>
        <p className="mt-2 text-sm text-amber-900">
          {ln42?.shortLabel} effective <strong>{ln42?.effectiveDate}</strong>. Reg 84 transition
          window closes <strong>{REG_84_UNEXTENDED_DEADLINE}</strong> unless extended by the Cabinet
          Secretary. Every operator currently holds manuals citing the repealed 2018 framework.
        </p>
      </section>

      <section>
        <h1 className="mb-1 text-2xl font-bold tracking-tight text-navy-900">Dashboard</h1>
        <p className="text-sm text-slate-700">
          Operator-wide snapshot as of <strong>{asOfIso}</strong>. Item-level counts across{' '}
          {totalPilots} pilots × {CURRENCY_CATALOG.length} currencies ={' '}
          {totalItems.toLocaleString()} cells.
        </p>
      </section>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          icon={<Users className="h-5 w-5" />}
          label="Pilots"
          value={totalPilots}
          sub={`${countRole('Captain')} CPT · ${countRole('First Officer')} FO`}
          tone="navy"
        />
        <StatCard
          icon={<CheckCircle className="h-5 w-5" />}
          label="Current"
          value={itemStatusCounts.CURRENT}
          sub={`of ${totalItems} cells`}
          tone="emerald"
        />
        <StatCard
          icon={<Clock className="h-5 w-5" />}
          label="Caution + Action"
          value={itemStatusCounts.CAUTION + itemStatusCounts.ACTION}
          sub="≤ 90 days to expiry"
          tone="amber"
        />
        <StatCard
          icon={<AlertTriangle className="h-5 w-5" />}
          label="Expired"
          value={itemStatusCounts.EXPIRED}
          sub="Immediate remediation"
          tone="red"
        />
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Panel icon={<TrendingUp className="h-4 w-4" />} title="Crew by operator">
          <DistList rows={operatorRows} total={totalPilots} barClass="bg-navy-700" />
        </Panel>

        <Panel icon={<Activity className="h-4 w-4" />} title="Item-status distribution">
          <DistList
            rows={CURRENCY_STATUS.map((s) => ({
              label: humanStatus(s),
              value: itemStatusCounts[s],
            }))}
            total={totalItems}
            barClassByLabel={STATUS_BAR_CLASS}
          />
        </Panel>

        <Panel icon={<Plane className="h-4 w-4" />} title="Pilot phase distribution">
          <DistList rows={phaseRows} total={totalPilots} barClass="bg-amber-500" />
        </Panel>
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="flex items-center justify-between bg-navy-900 px-5 py-3 text-white">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <AlertTriangle className="h-4 w-4 text-amber-500" /> Expiring soon
          </h3>
          <span className="text-xs text-slate-300">
            top {Math.min(10, expiringSoon.length)} of {expiringSoon.length}
          </span>
        </div>
        {expiringSoon.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-slate-500">
            All crew currencies are within normal validity. ✓
          </div>
        ) : (
          <ul className="divide-y divide-slate-200">
            {expiringSoon.slice(0, 10).map((row, idx) => (
              <li
                key={`${row.pilotName}-${row.currencyLabel}-${idx}`}
                className="flex items-center justify-between px-5 py-3 hover:bg-slate-50"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-navy-900">{row.pilotName}</div>
                  <div className="truncate text-xs text-slate-600">
                    {row.operatorShort} · {row.currencyLabel}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-xs text-slate-600">{row.validTo}</span>
                  <span
                    className={`rounded px-2 py-1 text-[10px] ${STATUS_PILL_CLASS[row.status]}`}
                  >
                    {row.status === 'EXPIRED' ? 'Expired' : `${row.daysToExpiry}d`}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="border-t border-slate-200 bg-slate-50 px-5 py-2 text-xs">
          <Link href="/pilots" className="text-navy-700 hover:underline">
            Open Currency Tracker →
          </Link>
        </div>
      </section>
    </div>
  );
}

const STATUS_PILL_CLASS: Record<CurrencyStatus, string> = {
  CURRENT: 'bg-emerald-100 text-emerald-800 border border-emerald-300',
  CAUTION: 'bg-amber-100 text-amber-800 border border-amber-300',
  ACTION: 'bg-red-100 text-red-800 border border-red-300',
  EXPIRED: 'bg-red-600 text-white',
  NOT_APPLICABLE: 'bg-slate-200 text-slate-600',
};

const STATUS_BAR_CLASS: Record<string, string> = {
  Current: 'bg-emerald-500',
  Caution: 'bg-amber-500',
  Action: 'bg-red-400',
  Expired: 'bg-red-700',
  'N/A': 'bg-slate-300',
};

function humanStatus(s: CurrencyStatus): string {
  return s === 'NOT_APPLICABLE' ? 'N/A' : s.charAt(0) + s.slice(1).toLowerCase();
}

function countRole(role: 'Captain' | 'First Officer'): number {
  return DEMO_PILOTS.filter((p) => p.role === role).length;
}

function StatCard({
  icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  sub: string;
  tone: 'navy' | 'emerald' | 'amber' | 'red';
}) {
  const bg = {
    navy: 'bg-navy-900',
    emerald: 'bg-emerald-600',
    amber: 'bg-amber-500',
    red: 'bg-red-600',
  }[tone];
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4">
      <div className={`flex h-12 w-12 items-center justify-center rounded text-white ${bg}`}>
        {icon}
      </div>
      <div>
        <div className="text-2xl font-bold text-navy-900 tabular-nums">{value}</div>
        <div className="text-xs font-medium text-slate-700">{label}</div>
        <div className="text-[10px] text-slate-500">{sub}</div>
      </div>
    </div>
  );
}

function Panel({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-navy-900">
        <span className="text-navy-700">{icon}</span>
        {title}
      </h3>
      {children}
    </div>
  );
}

function DistList({
  rows,
  total,
  barClass,
  barClassByLabel,
}: {
  rows: ReadonlyArray<{ label: string; value: number }>;
  total: number;
  barClass?: string;
  barClassByLabel?: Record<string, string>;
}) {
  return (
    <div className="space-y-2">
      {rows.map((r) => {
        const pct = total > 0 ? (r.value / total) * 100 : 0;
        const colour = barClassByLabel?.[r.label] ?? barClass ?? 'bg-navy-700';
        return (
          <div key={r.label}>
            <div className="mb-1 flex justify-between text-xs">
              <span className="capitalize text-slate-700">{r.label}</span>
              <span className="font-medium tabular-nums">{r.value}</span>
            </div>
            <div className="h-2 overflow-hidden rounded bg-slate-100">
              <div
                className={`${colour} h-full`}
                style={{ width: `${pct.toFixed(1)}%` }}
                aria-hidden
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
