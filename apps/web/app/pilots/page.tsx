import Link from 'next/link';
import {
  CURRENCY_CATALOG,
  CURRENCY_CATEGORY,
  DEMO_OPERATORS,
  DEMO_PILOTS,
  buildDemoCurrencyRecords,
  currencyMapKey,
  indexCurrencyByPilotAndKind,
  statusFor,
  type CurrencyCategory,
  type CurrencyStatus,
  type IsoDate,
  type Pilot,
} from '@dnca/domain';

export const dynamic = 'force-dynamic';

export default function PilotsPage() {
  const asOf = new Date();
  const asOfIso = asOf.toISOString().slice(0, 10) as IsoDate;
  const records = buildDemoCurrencyRecords(asOf);
  const index = indexCurrencyByPilotAndKind(records);
  const operatorsById = new Map(DEMO_OPERATORS.map((o) => [o.id, o]));

  return (
    <div className="space-y-8">
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-navy-900">
            Pilots — Currency Tracker
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-700">
            Per-pilot currency matrix across the {CURRENCY_CATALOG.length}-item catalog in{' '}
            <code className="rounded bg-slate-100 px-1 py-0.5">@dnca/domain</code>. Status colour is
            computed by <code className="rounded bg-slate-100 px-1 py-0.5">statusFor()</code> using
            the same logic that protects the database write path. Currently rendering deterministic
            demo data; backend wiring lands once the API framework decision is made.
          </p>
          <p className="mt-2 max-w-3xl text-xs text-slate-500">
            As of <strong>{asOfIso}</strong>. {DEMO_PILOTS.length} pilots across{' '}
            {DEMO_OPERATORS.length} operators.
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-2">
          {DEMO_OPERATORS.map((op) => (
            <a
              key={op.id}
              href={`/exports/crew-currency-snapshot?operatorId=${op.id}`}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-2 rounded border border-navy-300 bg-white px-3 py-2 text-xs font-medium text-navy-900 hover:bg-navy-50"
            >
              Snapshot — {op.tradingName}
            </a>
          ))}
          <span className="text-[10px] text-slate-500">
            Opens print-ready view; Cmd-P → Save as PDF
          </span>
        </div>
      </header>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-navy-900 text-white">
              <tr>
                <th className="sticky left-0 z-10 bg-navy-900 px-3 py-3 text-left font-medium">
                  Pilot
                </th>
                {CURRENCY_CATALOG.map((c) => (
                  <th
                    key={c.kind}
                    className="px-2 py-3 text-center font-medium"
                    title={`${c.category} — ${c.primarySource}`}
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {DEMO_PILOTS.map((pilot) => {
                const operator = operatorsById.get(pilot.operatorId);
                return (
                  <tr key={pilot.id} className="hover:bg-slate-50">
                    <td className="sticky left-0 bg-white px-3 py-2 align-top">
                      <Link
                        href={`/pilots/${encodeURIComponent(pilot.id)}`}
                        className="block hover:underline"
                      >
                        <div className="font-medium text-navy-900">{pilot.fullName}</div>
                        <div className="text-[11px] text-slate-500">
                          {operator?.tradingName ?? 'Unknown'} · {pilot.role} · {pilot.baseIcao}
                        </div>
                        <div className="text-[10px] uppercase tracking-wide text-slate-400">
                          {pilot.phase.replace(/_/g, ' ')}
                        </div>
                      </Link>
                    </td>
                    {CURRENCY_CATALOG.map((c) => {
                      const rec = index.get(currencyMapKey(pilot.id, c.kind));
                      const status = statusFor({
                        kind: c.kind,
                        phase: pilot.phase,
                        validTo: rec?.validTo,
                        asOf: asOfIso,
                      });
                      return (
                        <td key={c.kind} className="px-2 py-2 text-center align-top">
                          <StatusPill status={status} validTo={rec?.validTo} asOf={asOfIso} />
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Legend />
      </div>

      <Summary pilots={DEMO_PILOTS} index={index} asOfIso={asOfIso} />
    </div>
  );
}

function StatusPill({
  status,
  validTo,
  asOf,
}: {
  status: CurrencyStatus;
  validTo?: IsoDate | undefined;
  asOf: IsoDate;
}) {
  const styles: Record<CurrencyStatus, string> = {
    CURRENT: 'bg-emerald-100 text-emerald-800 border border-emerald-300',
    CAUTION: 'bg-amber-100 text-amber-800 border border-amber-300',
    ACTION: 'bg-red-100 text-red-800 border border-red-300',
    EXPIRED: 'bg-red-600 text-white',
    NOT_APPLICABLE: 'bg-slate-200 text-slate-600',
  };
  const label = formatLabel(status, validTo, asOf);
  return (
    <span
      className={`inline-block whitespace-nowrap rounded px-2 py-0.5 text-[10px] ${styles[status]}`}
      title={validTo ? `Valid to ${validTo}` : status}
    >
      {label}
    </span>
  );
}

function formatLabel(status: CurrencyStatus, validTo: IsoDate | undefined, asOf: IsoDate): string {
  if (status === 'NOT_APPLICABLE') return 'N/A';
  if (status === 'CURRENT') return 'Current';
  if (status === 'EXPIRED') return validTo ? 'Expired' : 'Missing';
  if (!validTo) return status === 'ACTION' ? 'Action' : 'Caution';
  const days = Math.ceil((Date.parse(validTo) - Date.parse(asOf)) / 86_400_000);
  return `${days}d`;
}

function Legend() {
  return (
    <div className="flex flex-wrap gap-4 border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
      <LegendDot color="bg-emerald-500" label="Current (> 90 days)" />
      <LegendDot color="bg-amber-500" label="Caution (31–90 days)" />
      <LegendDot color="bg-red-400" label="Action (1–30 days)" />
      <LegendDot color="bg-red-700" label="Expired (≤ 0 days)" />
      <LegendDot color="bg-slate-300" label="N/A (in-training, type-rating derivatives)" />
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-2">
      <span className={`inline-block h-3 w-3 rounded ${color}`} />
      {label}
    </span>
  );
}

function Summary({
  pilots,
  index,
  asOfIso,
}: {
  pilots: ReadonlyArray<Pilot>;
  index: ReadonlyMap<string, ReturnType<typeof buildDemoCurrencyRecords>[number]>;
  asOfIso: IsoDate;
}) {
  const tallyByCategory = new Map<CurrencyCategory, Record<CurrencyStatus, number>>();
  for (const cat of CURRENCY_CATEGORY) {
    tallyByCategory.set(cat, {
      CURRENT: 0,
      CAUTION: 0,
      ACTION: 0,
      EXPIRED: 0,
      NOT_APPLICABLE: 0,
    });
  }
  for (const pilot of pilots) {
    for (const c of CURRENCY_CATALOG) {
      const rec = index.get(currencyMapKey(pilot.id, c.kind));
      const status = statusFor({
        kind: c.kind,
        phase: pilot.phase,
        validTo: rec?.validTo,
        asOf: asOfIso,
      });
      const bucket = tallyByCategory.get(c.category)!;
      bucket[status] += 1;
    }
  }

  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">
        Distribution by category
      </h2>
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-slate-700">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Category</th>
              <th className="px-3 py-2 text-right font-medium">Current</th>
              <th className="px-3 py-2 text-right font-medium">Caution</th>
              <th className="px-3 py-2 text-right font-medium">Action</th>
              <th className="px-3 py-2 text-right font-medium">Expired</th>
              <th className="px-3 py-2 text-right font-medium">N/A</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {CURRENCY_CATEGORY.map((cat) => {
              const b = tallyByCategory.get(cat)!;
              return (
                <tr key={cat}>
                  <td className="px-3 py-2 font-medium text-navy-900">{cat}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{b.CURRENT}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{b.CAUTION}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{b.ACTION}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{b.EXPIRED}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-500">
                    {b.NOT_APPLICABLE}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
