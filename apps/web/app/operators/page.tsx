import { Building2, Check, Minus } from 'lucide-react';
import { DEMO_OPERATORS, type Operator, type OperatorConfig } from '@dnca/domain';

export const dynamic = 'force-dynamic';

/**
 * Per-operator configuration — the multi-tenant config that drives the
 * platform per deployment (ADR 0006 / CLAUDE.md). Stabilised-approach gates are
 * operator OM-A submissions (LN 42/2026 §2.1.25 prescribes no values), grading
 * scale and FTL/fuel policy are operator-chosen, OpSpecs gate which currencies
 * apply. Surfaced read-only here; an editor lands with the settings RBAC slice.
 */
export default function OperatorsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-navy-900">
          <Building2 className="h-6 w-6 text-navy-700" /> Operator configuration
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-700">
          Per-operator OM-A / OpSpec configuration. Each deployment is bespoke config over the
          shared platform — stabilised-approach gates, grading scale, fuel policy and operational
          specifications drive what the engine enforces for that operator.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {DEMO_OPERATORS.map((op) => (
          <OperatorCard key={op.id} operator={op} />
        ))}
      </div>
    </div>
  );
}

function OperatorCard({ operator }: { operator: Operator }) {
  const c: OperatorConfig = operator.config;
  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <header className="flex items-center justify-between bg-navy-900 px-5 py-3 text-white">
        <div>
          <div className="text-sm font-semibold">{operator.legalName}</div>
          <div className="text-[11px] text-slate-300">
            {operator.tradingName} · AOC {operator.aocNumber} · {operator.countryIso2}
          </div>
        </div>
        <span className="rounded bg-amber-500 px-2 py-1 text-[10px] font-bold text-navy-900">
          {operator.status.toUpperCase()}
        </span>
      </header>

      <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
        <Field label="Stabilised approach gate">
          {c.stabilisedApproachGate.imcFeetAal} ft AAL IMC · {c.stabilisedApproachGate.vmcFeetAal}{' '}
          ft AAL VMC
          <Note>Operator OM-A; LN 42/2026 §2.1.25 prescribes no fixed values.</Note>
        </Field>
        <Field label="Grading scale">{c.gradingScale}</Field>
        <Field label="Fuel policy">
          {c.fuelPolicy.contingencyPercent}% contingency · {c.fuelPolicy.finalReserveMinutes} min
          final reserve
        </Field>
        <Field label="Branding">
          <span className="inline-flex items-center gap-2">
            <Swatch hex={c.branding.primaryColour} /> {c.branding.primaryColour}
            <Swatch hex={c.branding.accentColour} /> {c.branding.accentColour}
          </span>
        </Field>
        <div className="sm:col-span-2">
          <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
            Operational specifications
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {(
              [
                ['RVSM', c.opSpecs.rvsm],
                ['RNP', c.opSpecs.rnp],
                ['CAT II', c.opSpecs.catII],
                ['CAT III', c.opSpecs.catIII],
                ['LVO', c.opSpecs.lvo],
                ['EDTO', c.opSpecs.edto],
              ] as const
            ).map(([label, on]) => (
              <span
                key={label}
                className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-xs ${
                  on
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                    : 'border-slate-200 bg-slate-50 text-slate-400'
                }`}
              >
                {on ? <Check className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-sm text-slate-800">{children}</div>
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return <div className="mt-1 text-[10px] italic text-slate-500">{children}</div>;
}

function Swatch({ hex }: { hex: string }) {
  return (
    <span
      className="inline-block h-3.5 w-3.5 rounded-full ring-1 ring-slate-300"
      style={{ backgroundColor: hex }}
      aria-hidden
    />
  );
}
