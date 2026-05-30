import {
  AlertTriangle,
  CalendarClock,
  CalendarPlus,
  CheckCircle,
  Clock,
  Plane,
} from 'lucide-react';
import {
  DEMO_OPERATORS,
  DEMO_PILOTS,
  buildDemoCurrencyRecords,
  computeTrainingDueEvents,
  groupTrainingDueByUrgency,
  type IsoDate,
  type TrainingDueEvent,
  type Urgency,
} from '@dnca/domain';

export const dynamic = 'force-dynamic';

/**
 * Training scheduling worklist — the FCTS side of the integration seam with the
 * rostering platform (Ratiba). The FCTS owns training currency; it computes the
 * set of currencies that need a booking inside the planning horizon and renders
 * them here. The same typed TrainingDueEvent set is what the roster system
 * consumes to reserve a duty-free window and (for OPC/LPC) a simulator slot.
 */
export default function SchedulingPage() {
  const asOfDate = new Date();
  const asOf = asOfDate.toISOString().slice(0, 10) as IsoDate;
  const records = buildDemoCurrencyRecords(asOfDate);
  const events = computeTrainingDueEvents({ pilots: DEMO_PILOTS, currencyRecords: records, asOf });
  const grouped = groupTrainingDueByUrgency(events);
  const operatorName = (id: string) => DEMO_OPERATORS.find((o) => o.id === id)?.tradingName ?? '—';

  const simSlots = events.filter((e) => e.requiresSimSlot).length;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-navy-900">
          <CalendarClock className="h-6 w-6 text-navy-700" />
          Training scheduling
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-700">
          Currencies due for booking within 90 days, computed from the same{' '}
          <code className="rounded bg-slate-100 px-1">statusFor()</code> logic as the currency
          tracker. This worklist is the integration seam: each row is a typed{' '}
          <code className="rounded bg-slate-100 px-1">TrainingDueEvent</code> the rostering platform
          consumes to reserve a duty-free window and, for OPC/LPC, a simulator slot. As of{' '}
          <strong>{asOf}</strong>.
        </p>
      </header>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat
          icon={<AlertTriangle className="h-5 w-5" />}
          label="Overdue"
          value={grouped.OVERDUE.length}
          tone="red"
        />
        <Stat
          icon={<Clock className="h-5 w-5" />}
          label="Book now (≤30d)"
          value={grouped.BOOK_NOW.length}
          tone="amber"
        />
        <Stat
          icon={<CalendarClock className="h-5 w-5" />}
          label="Plan (31–90d)"
          value={grouped.PLAN.length}
          tone="navy"
        />
        <Stat
          icon={<Plane className="h-5 w-5" />}
          label="Sim slots needed"
          value={simSlots}
          tone="emerald"
        />
      </section>

      {events.length === 0 ? (
        <div className="flex items-center gap-3 rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900">
          <CheckCircle className="h-5 w-5" /> No training due within the planning horizon. ✓
        </div>
      ) : (
        <>
          <UrgencyGroup
            title="Overdue — escalate"
            subtitle="Currency already lapsed; crew should be held off type until renewed."
            urgency="OVERDUE"
            events={grouped.OVERDUE}
            operatorName={operatorName}
          />
          <UrgencyGroup
            title="Book now — within 30 days"
            subtitle="Inside the action window; secure the slot immediately."
            urgency="BOOK_NOW"
            events={grouped.BOOK_NOW}
            operatorName={operatorName}
          />
          <UrgencyGroup
            title="Plan — 31 to 90 days"
            subtitle="Forward planning; book before the 'book-by' date to stay clear."
            urgency="PLAN"
            events={grouped.PLAN}
            operatorName={operatorName}
          />
        </>
      )}
    </div>
  );
}

function UrgencyGroup({
  title,
  subtitle,
  urgency,
  events,
  operatorName,
}: {
  title: string;
  subtitle: string;
  urgency: Urgency;
  events: ReadonlyArray<TrainingDueEvent>;
  operatorName: (id: string) => string;
}) {
  if (events.length === 0) return null;
  const accent = {
    OVERDUE: 'border-red-300',
    BOOK_NOW: 'border-amber-300',
    PLAN: 'border-slate-200',
  }[urgency];
  return (
    <section className={`overflow-hidden rounded-lg border ${accent} bg-white`}>
      <div className="border-b border-slate-100 px-5 py-3">
        <h2 className="text-sm font-semibold text-navy-900">
          {title} <span className="text-slate-400">· {events.length}</span>
        </h2>
        <p className="text-xs text-slate-500">{subtitle}</p>
      </div>
      <ul className="divide-y divide-slate-100">
        {events.map((e) => (
          <li
            key={`${e.pilotId}-${e.kind}`}
            className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-medium text-navy-900">{e.pilotName}</span>
                {e.requiresSimSlot ? (
                  <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800">
                    SIM SLOT
                  </span>
                ) : null}
              </div>
              <div className="truncate text-xs text-slate-600">
                {operatorName(e.operatorId)} · {e.label}
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-3 text-xs">
              <div className="text-right">
                <div className="text-slate-500">expires</div>
                <div className="font-medium text-slate-800">{e.validTo}</div>
              </div>
              <DaysChip status={e.status} days={e.daysToExpiry} />
              <div className="text-right">
                <div className="text-slate-500">book by</div>
                <div
                  className={`font-medium ${e.bookingOverdue ? 'text-red-700' : 'text-slate-800'}`}
                >
                  {e.bookByDate}
                  {e.bookingOverdue ? ' ⚠' : ''}
                </div>
              </div>
              <span
                title="Publishes this TrainingDueEvent to the rostering platform (Ratiba) to reserve the window/sim slot. Backend wiring pending."
                className="inline-flex cursor-not-allowed items-center gap-1 rounded border border-navy-700 px-2.5 py-1 font-medium text-navy-800 opacity-80"
              >
                <CalendarPlus className="h-3.5 w-3.5" /> Book slot
              </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function DaysChip({ status, days }: { status: TrainingDueEvent['status']; days: number }) {
  const cls = {
    EXPIRED: 'bg-red-600 text-white',
    ACTION: 'bg-orange-100 text-orange-800',
    CAUTION: 'bg-amber-100 text-amber-800',
  }[status];
  return (
    <span className={`rounded px-2 py-1 text-[11px] font-semibold tabular-nums ${cls}`}>
      {status === 'EXPIRED' ? `${Math.abs(days)}d overdue` : `${days}d`}
    </span>
  );
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
  tone: 'navy' | 'amber' | 'red' | 'emerald';
}) {
  const bg = {
    navy: 'bg-navy-900',
    amber: 'bg-amber-500',
    red: 'bg-red-600',
    emerald: 'bg-emerald-600',
  }[tone];
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4">
      <div className={`flex h-11 w-11 items-center justify-center rounded text-white ${bg}`}>
        {icon}
      </div>
      <div>
        <div className="text-2xl font-bold tabular-nums text-navy-900">{value}</div>
        <div className="text-[11px] font-medium text-slate-600">{label}</div>
      </div>
    </div>
  );
}
