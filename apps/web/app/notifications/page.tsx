import { AlertTriangle, BellRing, Clock, Info, Mail, MessageSquare, Send } from 'lucide-react';
import {
  DEMO_OPERATORS,
  DEMO_PILOTS,
  buildDemoCurrencyRecords,
  computeDueNotifications,
  planNotificationDispatch,
  type ExpiryNotification,
  type IsoDate,
  type NotificationSeverity,
} from '@dnca/domain';

export const dynamic = 'force-dynamic';

/**
 * Notification engine surface — the currency-expiry alert cascade
 * (90/60/30/14/7-day). One alert per (pilot, currency) entering the cascade,
 * grouped by severity, with the channels that would be dispatched. The actual
 * email/SMS/Telegram send is the next (provider-backed) slice; this view is the
 * operator-facing preview of what would go out.
 */
export default function NotificationsPage() {
  const asOfDate = new Date();
  const asOf = asOfDate.toISOString().slice(0, 10) as IsoDate;
  const records = buildDemoCurrencyRecords(asOfDate);
  const items = computeDueNotifications({ pilots: DEMO_PILOTS, currencyRecords: records, asOf });
  const plan = planNotificationDispatch(items);
  const operatorName = (id: string) => DEMO_OPERATORS.find((o) => o.id === id)?.tradingName ?? '—';

  const groups: Array<{ sev: NotificationSeverity; rows: ExpiryNotification[] }> = (
    ['EXPIRED', 'URGENT', 'WARN', 'INFO'] as const
  ).map((sev) => ({ sev, rows: items.filter((i) => i.severity === sev) }));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-navy-900">
          <BellRing className="h-6 w-6 text-navy-700" /> Notifications
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-700">
          Currency-expiry alert cascade (90 / 60 / 30 / 14 / 7-day), computed from the same{' '}
          <code className="rounded bg-slate-100 px-1">statusFor()</code> logic as the dashboard.
          Each row is one alert that would be dispatched on the shown channels. As of{' '}
          <strong>{asOf}</strong>.
        </p>
      </header>

      {items.length > 0 ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-700">
          <span className="font-semibold text-navy-900">Dry-run dispatch:</span> would send{' '}
          <strong>{plan.messages.length}</strong> message(s) to{' '}
          <strong>{plan.recipientCount}</strong> crew — {plan.byChannel.EMAIL} email ·{' '}
          {plan.byChannel.SMS} SMS · {plan.byChannel.TELEGRAM} Telegram.{' '}
          <span className="italic text-slate-500">(provider send pending)</span>
        </div>
      ) : null}

      {items.length === 0 ? (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900">
          No currencies inside the alert cascade. ✓
        </div>
      ) : (
        groups.map(({ sev, rows }) =>
          rows.length === 0 ? null : (
            <section
              key={sev}
              className={`overflow-hidden rounded-lg border ${BORDER[sev]} bg-white`}
            >
              <div className="flex items-center justify-between px-5 py-3">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-navy-900">
                  <SeverityIcon sev={sev} /> {LABEL[sev]}{' '}
                  <span className="text-slate-400">· {rows.length}</span>
                </h2>
              </div>
              <ul className="divide-y divide-slate-100">
                {rows.map((n) => (
                  <li
                    key={`${n.pilotId}-${n.kind}`}
                    className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-navy-900">
                        {n.pilotName}
                      </div>
                      <div className="truncate text-xs text-slate-600">
                        {operatorName(n.operatorId)} · {n.label}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-3 text-xs">
                      <span className="text-slate-600">{n.validTo}</span>
                      <span
                        className={`rounded px-2 py-1 text-[11px] font-semibold tabular-nums ${PILL[sev]}`}
                      >
                        {n.daysToExpiry <= 0
                          ? `${Math.abs(n.daysToExpiry)}d overdue`
                          : `${n.daysToExpiry}d`}
                      </span>
                      <span className="flex items-center gap-1 text-slate-500">
                        {n.channels.map((c) => (
                          <ChannelIcon key={c} channel={c} />
                        ))}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ),
        )
      )}
    </div>
  );
}

const LABEL: Record<NotificationSeverity, string> = {
  EXPIRED: 'Expired — escalate',
  URGENT: 'Urgent (≤14 days)',
  WARN: 'Warning (≤30 days)',
  INFO: 'Heads-up (≤90 days)',
};
const BORDER: Record<NotificationSeverity, string> = {
  EXPIRED: 'border-red-300',
  URGENT: 'border-orange-300',
  WARN: 'border-amber-300',
  INFO: 'border-slate-200',
};
const PILL: Record<NotificationSeverity, string> = {
  EXPIRED: 'bg-red-600 text-white',
  URGENT: 'bg-orange-100 text-orange-800',
  WARN: 'bg-amber-100 text-amber-800',
  INFO: 'bg-slate-100 text-slate-700',
};

function SeverityIcon({ sev }: { sev: NotificationSeverity }) {
  if (sev === 'EXPIRED' || sev === 'URGENT')
    return <AlertTriangle className="h-4 w-4 text-red-600" />;
  if (sev === 'WARN') return <Clock className="h-4 w-4 text-amber-600" />;
  return <Info className="h-4 w-4 text-slate-500" />;
}

function ChannelIcon({ channel }: { channel: 'EMAIL' | 'SMS' | 'TELEGRAM' }) {
  const cls = 'h-3.5 w-3.5';
  if (channel === 'EMAIL') return <Mail className={cls} aria-label="email" />;
  if (channel === 'SMS') return <Send className={cls} aria-label="SMS" />;
  return <MessageSquare className={cls} aria-label="Telegram" />;
}
