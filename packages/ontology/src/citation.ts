/**
 * Regulatory citation primitives.
 *
 * Every regulatory claim in the platform — knowledge library content, AI
 * assessment generation, KCAA export covers, OM cross-reference matrices —
 * routes through these types. A claim that cannot cite a primary source via
 * `Citation` is not a claim the platform makes.
 */

export const FRAMEWORK = ['KCARs', 'ICAO', 'FAA', 'EASA', 'KCAA-AC'] as const;
export type Framework = (typeof FRAMEWORK)[number];

/**
 * A regulatory instrument: a single piece of regulation (LN, Annex, Part, AC,
 * AMC, Doc). Instruments have stable `instrumentId`s — these are the join keys
 * used by the cross-reference matrix and by `Citation`.
 */
export interface RegulatoryInstrument {
  framework: Framework;
  instrumentId: string;
  shortLabel: string;
  longLabel: string;
  effectiveDate?: string;
  supersededBy?: string;
  authoritativeUrl?: string;
  notes?: string;
  /**
   * True only when the instrument's subject/number has been checked against the
   * gazetted primary source (the PDF on file), not inferred. Inspector-facing
   * surfaces may badge a citation whose instrument is not yet verified. Absent
   * is treated as "not verified".
   */
  primarySourceVerified?: boolean;
}

/**
 * A citation pins a claim to a specific section of an instrument. `section`
 * uses the instrument's native notation (e.g. '17(3)' for KCARs regs,
 * '§2.1.25' for Third Schedule clauses, 'AMC1 ORO.FC.220' for EASA).
 */
export interface Citation {
  instrument: RegulatoryInstrument;
  section?: string;
  subject?: string;
}

export function formatCitation(c: Citation): string {
  const base = c.section ? `${c.instrument.shortLabel} ${c.section}` : c.instrument.shortLabel;
  return c.subject ? `${base} — ${c.subject}` : base;
}

/**
 * Stable identifier suitable for use as a URL fragment, a database key, or a
 * cross-reference anchor.
 */
export function citationKey(c: Citation): string {
  const sectionPart = c.section ? `:${c.section.replace(/[^A-Za-z0-9.-]/g, '_')}` : '';
  return `${c.instrument.instrumentId}${sectionPart}`;
}
