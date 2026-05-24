import type { Citation, RegulatoryInstrument } from './citation.js';

/**
 * ICAO Standards and Recommended Practices, plus operational documents. SARPs
 * carry State-level obligation through Kenya's membership; KCARs 2025
 * implements them in domestic law.
 */

export const ICAO_ANNEX_1: RegulatoryInstrument = {
  framework: 'ICAO',
  instrumentId: 'ICAO-Annex-1',
  shortLabel: 'Annex 1',
  longLabel: 'ICAO Annex 1 — Personnel Licensing (Amdt 49)',
};

export const ICAO_ANNEX_6_I: RegulatoryInstrument = {
  framework: 'ICAO',
  instrumentId: 'ICAO-Annex-6-Pt-I',
  shortLabel: 'Annex 6 Pt I',
  longLabel: 'ICAO Annex 6 Part I — Operation of Aircraft (International Commercial Air Transport)',
};

export const ICAO_ANNEX_17: RegulatoryInstrument = {
  framework: 'ICAO',
  instrumentId: 'ICAO-Annex-17',
  shortLabel: 'Annex 17',
  longLabel: 'ICAO Annex 17 — Aviation Security',
};

export const ICAO_ANNEX_18: RegulatoryInstrument = {
  framework: 'ICAO',
  instrumentId: 'ICAO-Annex-18',
  shortLabel: 'Annex 18',
  longLabel: 'ICAO Annex 18 — The Safe Transport of Dangerous Goods by Air',
};

export const ICAO_ANNEX_19: RegulatoryInstrument = {
  framework: 'ICAO',
  instrumentId: 'ICAO-Annex-19',
  shortLabel: 'Annex 19',
  longLabel: 'ICAO Annex 19 — Safety Management',
};

export const ICAO_DOC_9868: RegulatoryInstrument = {
  framework: 'ICAO',
  instrumentId: 'ICAO-Doc-9868',
  shortLabel: 'Doc 9868',
  longLabel:
    'ICAO Doc 9868 — PANS-TRG (Procedures for Air Navigation Services — Training), 3rd Ed 2020',
};

export const ICAO_DOC_9859: RegulatoryInstrument = {
  framework: 'ICAO',
  instrumentId: 'ICAO-Doc-9859',
  shortLabel: 'Doc 9859',
  longLabel: 'ICAO Doc 9859 — Safety Management Manual',
};

export const ICAO_DOC_9683: RegulatoryInstrument = {
  framework: 'ICAO',
  instrumentId: 'ICAO-Doc-9683',
  shortLabel: 'Doc 9683',
  longLabel: 'ICAO Doc 9683 — Human Factors Training Manual',
};

export const ICAO_DOC_9966: RegulatoryInstrument = {
  framework: 'ICAO',
  instrumentId: 'ICAO-Doc-9966',
  shortLabel: 'Doc 9966',
  longLabel: 'ICAO Doc 9966 — Manual for the Oversight of Fatigue Management Approaches',
};

export const ICAO_DOC_9284: RegulatoryInstrument = {
  framework: 'ICAO',
  instrumentId: 'ICAO-Doc-9284',
  shortLabel: 'Doc 9284',
  longLabel:
    'ICAO Doc 9284 — Technical Instructions for the Safe Transport of Dangerous Goods by Air',
};

export const ICAO_DOC_10000: RegulatoryInstrument = {
  framework: 'ICAO',
  instrumentId: 'ICAO-Doc-10000',
  shortLabel: 'Doc 10000',
  longLabel: 'ICAO Doc 10000 — Manual on Flight Data Analysis Programmes (FDAP)',
};

export const ICAO_DOC_8335: RegulatoryInstrument = {
  framework: 'ICAO',
  instrumentId: 'ICAO-Doc-8335',
  shortLabel: 'Doc 8335',
  longLabel:
    'ICAO Doc 8335 — Manual of Procedures for Operations Inspection, Certification and Continued Surveillance',
};

export const ICAO_INSTRUMENTS: ReadonlyArray<RegulatoryInstrument> = [
  ICAO_ANNEX_1,
  ICAO_ANNEX_6_I,
  ICAO_ANNEX_17,
  ICAO_ANNEX_18,
  ICAO_ANNEX_19,
  ICAO_DOC_9868,
  ICAO_DOC_9859,
  ICAO_DOC_9683,
  ICAO_DOC_9966,
  ICAO_DOC_9284,
  ICAO_DOC_10000,
  ICAO_DOC_8335,
];

// ----------------------------------------------------------------------------
// Frequently-used ICAO citations
// ----------------------------------------------------------------------------

export const ICAO_PIC_RECENCY: Citation = {
  instrument: ICAO_ANNEX_6_I,
  section: '9.4.4',
  subject: 'PIC recency — 90-day rolling, 3 take-offs/landings',
};

export const ICAO_DOC_9868_4_5_1: Citation = {
  instrument: ICAO_DOC_9868,
  section: '§4.5.1',
  subject: 'Base training on actual aircraft mandatory post-Skills Test when ZFTT unavailable',
};

export const ICAO_8_COMPETENCIES: Citation = {
  instrument: ICAO_DOC_9868,
  section: 'Chapter 2',
  subject: 'CBTA core competencies (8) — observable behaviours',
};
