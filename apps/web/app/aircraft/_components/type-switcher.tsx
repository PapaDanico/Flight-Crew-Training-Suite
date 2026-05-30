'use client';

import { useRouter } from 'next/navigation';

export interface TypeOption {
  id: string;
  label: string;
  status: 'production-ready' | 'preview' | 'draft';
}

const STATUS_LABEL: Record<TypeOption['status'], string> = {
  'production-ready': 'Production',
  preview: 'Preview',
  draft: 'Draft',
};

/**
 * Aircraft-type dropdown over the @dnca/domain type registry. Navigating
 * selects a profile via ?typeId=. Each option shows its calibration status so
 * a viewer always knows whether a type is SME-calibrated (Production) or an
 * uncalibrated stub (Preview / Draft) — the platform never presents an
 * un-calibrated type's operational facts as settled.
 */
export function TypeSwitcher({ options, selected }: { options: TypeOption[]; selected: string }) {
  const router = useRouter();
  return (
    <label className="flex shrink-0 flex-col gap-1">
      <span className="text-[10px] uppercase tracking-wide text-slate-500">Aircraft type</span>
      <select
        value={selected}
        onChange={(e) => router.push(`/aircraft?typeId=${e.target.value}`)}
        className="rounded border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-800 focus:border-navy-500 focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label} — {STATUS_LABEL[o.status]}
          </option>
        ))}
      </select>
    </label>
  );
}
