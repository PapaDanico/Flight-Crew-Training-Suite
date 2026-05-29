import type { CurrencyStatus, IsoDate, TrainingPhase } from '../../src/index.js';

/**
 * INTERNAL REGRESSION FIXTURE — pseudonymised, real-operator-derived data.
 *
 * Source: the anonymised crew-currency figures from the "Operator Alpha" CMS
 * demo handover (pilot names already coded CPT-/FO-; operator identity
 * pseudonymised per the advisory anonymisation mapping).
 *
 * GOVERNANCE (per the data-owner's explicit decision, and CLAUDE.md
 * §"Things to avoid" + Kenya DPA 2019):
 *   • This is pseudonymised PERSONAL DATA, retained for INTERNAL REGRESSION ONLY.
 *   • It MUST NOT be re-exported from the package, seeded into any demo/runtime
 *     database, or shipped to an operator-facing environment. Operator-facing
 *     demos use the SYNTHETIC cohort in src/fixtures.ts instead.
 *   • Data-minimised: only the two fields needed to regression-test currency
 *     status (Class-1 medical + OPC expiry) for a representative subset of crew
 *     are retained — not the full establishment, night rates, or risk flags.
 *
 * Purpose: lock the behaviour of statusFor() against a realistically-shaped,
 * real-world expiry distribution, complementing the fabricated demo fixtures.
 */

export interface AnonymisedCurrencyCase {
  readonly pilotId: string;
  readonly phase: TrainingPhase;
  readonly class1MedicalExpiry: IsoDate;
  readonly opcDue: IsoDate;
  /** Expected statuses evaluated at REGRESSION_AS_OF. */
  readonly expect: {
    readonly class1Medical: CurrencyStatus;
    readonly opc: CurrencyStatus;
  };
}

/** Fixed evaluation date chosen to exercise all four live status buckets. */
export const REGRESSION_AS_OF = '2026-09-01' as IsoDate;

export const ANONYMISED_CURRENCY_CASES: ReadonlyArray<AnonymisedCurrencyCase> = [
  {
    pilotId: 'OPA-CPT-005',
    phase: 'Line',
    class1MedicalExpiry: '2026-07-31' as IsoDate,
    opcDue: '2026-06-30' as IsoDate,
    expect: { class1Medical: 'EXPIRED', opc: 'EXPIRED' },
  },
  {
    pilotId: 'OPA-CPT-003',
    phase: 'Line',
    class1MedicalExpiry: '2026-09-30' as IsoDate,
    opcDue: '2026-09-30' as IsoDate,
    expect: { class1Medical: 'ACTION', opc: 'ACTION' },
  },
  {
    pilotId: 'OPA-CPT-012',
    phase: 'Line',
    class1MedicalExpiry: '2027-06-30' as IsoDate,
    opcDue: '2026-09-30' as IsoDate,
    expect: { class1Medical: 'CURRENT', opc: 'ACTION' },
  },
  {
    pilotId: 'OPA-FO-013',
    phase: 'Line',
    class1MedicalExpiry: '2026-10-31' as IsoDate,
    opcDue: '2026-09-30' as IsoDate,
    expect: { class1Medical: 'CAUTION', opc: 'ACTION' },
  },
  {
    pilotId: 'OPA-CPT-007',
    phase: 'Line',
    class1MedicalExpiry: '2027-01-31' as IsoDate,
    opcDue: '2026-12-31' as IsoDate,
    expect: { class1Medical: 'CURRENT', opc: 'CURRENT' },
  },
  {
    pilotId: 'OPA-FO-002',
    phase: 'Line',
    class1MedicalExpiry: '2027-02-28' as IsoDate,
    opcDue: '2026-12-31' as IsoDate,
    expect: { class1Medical: 'CURRENT', opc: 'CURRENT' },
  },
];
