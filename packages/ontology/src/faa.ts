import type { RegulatoryInstrument } from './citation.js';

/**
 * FAA 14 CFR Parts and Advisory Circulars cross-referenced from KCARs 2025.
 * Used by the platform for comparative analysis and by the AI prompts as
 * calibration anchors.
 */

export const FAA_14_CFR_121: RegulatoryInstrument = {
  framework: 'FAA',
  instrumentId: 'FAA-14-CFR-121',
  shortLabel: '14 CFR Part 121',
  longLabel:
    '14 CFR Part 121 — Operating Requirements: Domestic, Flag, and Supplemental Operations',
};

export const FAA_14_CFR_119: RegulatoryInstrument = {
  framework: 'FAA',
  instrumentId: 'FAA-14-CFR-119',
  shortLabel: '14 CFR Part 119',
  longLabel: '14 CFR Part 119 — Certification: Air Carriers and Commercial Operators',
};

export const FAA_14_CFR_61: RegulatoryInstrument = {
  framework: 'FAA',
  instrumentId: 'FAA-14-CFR-61',
  shortLabel: '14 CFR Part 61',
  longLabel: '14 CFR Part 61 — Certification: Pilots, Flight Instructors, Ground Instructors',
};

export const FAA_14_CFR_117: RegulatoryInstrument = {
  framework: 'FAA',
  instrumentId: 'FAA-14-CFR-117',
  shortLabel: '14 CFR Part 117',
  longLabel:
    '14 CFR Part 117 — Flight and Duty Limitations and Rest Requirements: Flightcrew Members',
};

export const FAA_14_CFR_5: RegulatoryInstrument = {
  framework: 'FAA',
  instrumentId: 'FAA-14-CFR-5',
  shortLabel: '14 CFR Part 5',
  longLabel: '14 CFR Part 5 — Safety Management Systems',
};

export const FAA_AC_120_51E: RegulatoryInstrument = {
  framework: 'FAA',
  instrumentId: 'FAA-AC-120-51E',
  shortLabel: 'AC 120-51E',
  longLabel: 'FAA Advisory Circular 120-51E — Crew Resource Management Training',
};

export const FAA_AC_120_71B: RegulatoryInstrument = {
  framework: 'FAA',
  instrumentId: 'FAA-AC-120-71B',
  shortLabel: 'AC 120-71B',
  longLabel:
    'FAA Advisory Circular 120-71B — Standard Operating Procedures and Pilot Monitoring Duties',
};

export const FAA_AC_120_82: RegulatoryInstrument = {
  framework: 'FAA',
  instrumentId: 'FAA-AC-120-82',
  shortLabel: 'AC 120-82',
  longLabel: 'FAA Advisory Circular 120-82 — Flight Operational Quality Assurance (FOQA)',
};

export const FAA_INSTRUMENTS: ReadonlyArray<RegulatoryInstrument> = [
  FAA_14_CFR_121,
  FAA_14_CFR_119,
  FAA_14_CFR_61,
  FAA_14_CFR_117,
  FAA_14_CFR_5,
  FAA_AC_120_51E,
  FAA_AC_120_71B,
  FAA_AC_120_82,
];
