import type { Citation, RegulatoryInstrument } from './citation.js';

/**
 * EASA Parts and Acceptable Means of Compliance (AMC) cross-referenced from
 * KCARs 2025.
 */

export const EASA_PART_CAT: RegulatoryInstrument = {
  framework: 'EASA',
  instrumentId: 'EASA-Part-CAT',
  shortLabel: 'Part-CAT',
  longLabel: 'EASA Part-CAT — Commercial Air Transport Operations',
};

export const EASA_PART_ORO: RegulatoryInstrument = {
  framework: 'EASA',
  instrumentId: 'EASA-Part-ORO',
  shortLabel: 'Part-ORO',
  longLabel: 'EASA Part-ORO — Organisation Requirements for Air Operations',
};

export const EASA_PART_FCL: RegulatoryInstrument = {
  framework: 'EASA',
  instrumentId: 'EASA-Part-FCL',
  shortLabel: 'Part-FCL',
  longLabel: 'EASA Part-FCL — Flight Crew Licensing',
};

export const EASA_PART_ARO: RegulatoryInstrument = {
  framework: 'EASA',
  instrumentId: 'EASA-Part-ARO',
  shortLabel: 'Part-ARO',
  longLabel: 'EASA Part-ARO — Authority Requirements for Air Operations',
};

export const EASA_CS_FSTD_A: RegulatoryInstrument = {
  framework: 'EASA',
  instrumentId: 'EASA-CS-FSTD-A',
  shortLabel: 'CS-FSTD(A)',
  longLabel:
    'EASA CS-FSTD(A) — Certification Specifications for Aeroplane Flight Simulation Training Devices',
};

export const EASA_AMC1_ORO_FC_220: RegulatoryInstrument = {
  framework: 'EASA',
  instrumentId: 'EASA-AMC1-ORO-FC-220',
  shortLabel: 'AMC1 ORO.FC.220',
  longLabel: 'EASA AMC1 ORO.FC.220 — Operator conversion training and checking',
};

export const EASA_AMC1_ORO_FC_230: RegulatoryInstrument = {
  framework: 'EASA',
  instrumentId: 'EASA-AMC1-ORO-FC-230',
  shortLabel: 'AMC1 ORO.FC.230',
  longLabel: 'EASA AMC1 ORO.FC.230 — Recurrent training and checking',
};

export const EASA_INSTRUMENTS: ReadonlyArray<RegulatoryInstrument> = [
  EASA_PART_CAT,
  EASA_PART_ORO,
  EASA_PART_FCL,
  EASA_PART_ARO,
  EASA_CS_FSTD_A,
  EASA_AMC1_ORO_FC_220,
  EASA_AMC1_ORO_FC_230,
];

export const EASA_CAT_II_III_RECENCY: Citation = {
  instrument: EASA_PART_FCL,
  section: 'FCL.825',
  subject: 'Cat II / Cat III approach currency requirements',
};

export const EASA_OPC: Citation = {
  instrument: EASA_PART_ORO,
  section: 'ORO.FC.230',
  subject: 'Operator Proficiency Check (OPC) — 6-monthly recurrent',
};
