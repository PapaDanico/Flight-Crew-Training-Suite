import {
  CURRENCY_CATALOG,
  CURRENCY_CATEGORY,
  currencyMapKey,
  indexCurrencyByPilotAndKind,
  lookupCurrency,
  statusFor,
  type CurrencyCategory,
  type CurrencyRecord,
  type CurrencyStatus,
  type IsoDate,
  type Operator,
  type Pilot,
} from '@dnca/domain';

/**
 * Crew Currency Snapshot — data assembler. Composes typed inputs into the
 * pure structure required by any renderer (HTML print view, server-side
 * PDF, CSV). Logic-free formatting belongs here; presentation in apps/web.
 *
 * KCAA-presentation discipline: identical numbers to what /pilots displays
 * because both routes through the same statusFor() in @dnca/domain.
 */

export interface CrewCurrencySnapshotInput {
  operator: Operator;
  pilots: ReadonlyArray<Pilot>;
  currencyRecords: ReadonlyArray<CurrencyRecord>;
  asOf: IsoDate;
  generatedByUserName?: string;
  generatedAt: Date;
}

export interface CurrencyRow {
  kind: string;
  label: string;
  validFrom: IsoDate | null;
  validTo: IsoDate | null;
  status: CurrencyStatus;
}

export interface CategoryBlock {
  category: CurrencyCategory;
  rows: ReadonlyArray<CurrencyRow>;
}

export interface PilotBlock {
  pilot: Pilot;
  categories: ReadonlyArray<CategoryBlock>;
  statusCounts: Record<CurrencyStatus, number>;
}

export interface CrewCurrencySnapshotData {
  operator: Operator;
  asOf: IsoDate;
  generatedAt: Date;
  generatedByUserName: string | null;
  pilots: ReadonlyArray<PilotBlock>;
  operatorTotals: Record<CurrencyStatus, number>;
  documentTitle: string;
}

export function buildCrewCurrencySnapshot(
  input: CrewCurrencySnapshotInput,
): CrewCurrencySnapshotData {
  const recordIndex = indexCurrencyByPilotAndKind(input.currencyRecords);
  const operatorTotals: Record<CurrencyStatus, number> = {
    CURRENT: 0,
    CAUTION: 0,
    ACTION: 0,
    EXPIRED: 0,
    NOT_APPLICABLE: 0,
  };

  const pilotBlocks: PilotBlock[] = input.pilots.map((pilot) => {
    const statusCounts: Record<CurrencyStatus, number> = {
      CURRENT: 0,
      CAUTION: 0,
      ACTION: 0,
      EXPIRED: 0,
      NOT_APPLICABLE: 0,
    };
    const categories: CategoryBlock[] = CURRENCY_CATEGORY.map((category) => {
      const rows: CurrencyRow[] = CURRENCY_CATALOG.filter((c) => c.category === category).map(
        (c) => {
          const rec = recordIndex.get(currencyMapKey(pilot.id, c.kind));
          const status = statusFor({
            kind: c.kind,
            phase: pilot.phase,
            validTo: rec?.validTo,
            asOf: input.asOf,
          });
          statusCounts[status] += 1;
          operatorTotals[status] += 1;
          return {
            kind: c.kind,
            label: lookupCurrency(c.kind).label,
            validFrom: rec?.validFrom ?? null,
            validTo: rec?.validTo ?? null,
            status,
          };
        },
      );
      return { category, rows };
    });
    return { pilot, categories, statusCounts };
  });

  return {
    operator: input.operator,
    asOf: input.asOf,
    generatedAt: input.generatedAt,
    generatedByUserName: input.generatedByUserName ?? null,
    pilots: pilotBlocks,
    operatorTotals,
    documentTitle: `Crew Currency Snapshot — ${input.operator.tradingName}`,
  };
}

export function crewCurrencySnapshotFilenameStem(operator: Operator, asOf: IsoDate): string {
  const safe = operator.shortCode.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  return `crew-currency-snapshot_${safe}_${asOf}`;
}
