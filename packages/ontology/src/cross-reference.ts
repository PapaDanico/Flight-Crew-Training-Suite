import type { Citation } from './citation.js';
import { EASA_AMC1_ORO_FC_230, EASA_PART_CAT, EASA_PART_FCL, EASA_PART_ORO } from './easa.js';
import {
  FAA_14_CFR_117,
  FAA_14_CFR_119,
  FAA_14_CFR_121,
  FAA_14_CFR_5,
  FAA_14_CFR_61,
  FAA_AC_120_51E,
  FAA_AC_120_82,
} from './faa.js';
import {
  ICAO_ANNEX_1,
  ICAO_ANNEX_6_I,
  ICAO_ANNEX_17,
  ICAO_ANNEX_19,
  ICAO_DOC_8335,
  ICAO_DOC_9683,
  ICAO_DOC_9859,
  ICAO_DOC_9868,
  ICAO_DOC_9966,
  ICAO_DOC_10000,
} from './icao.js';
import { LN_29_2026, LN_30_2026, LN_31_2026, LN_42_2026, REG_56_2 } from './kcars-2025.js';

/**
 * Domain-level cross-reference matrix. Each row is a regulatory subject area
 * (Operations, Training & Checking, FDAP, SMS, …) joined across the four
 * frameworks the platform tracks. Used by the Compliance UI tab and by KCAA
 * submission packs.
 *
 * Per Phase-0 audit finding §2.7, Fatigue Management is mapped to LN 30/2026
 * + Doc 9966 + Part 117 + ORO.FTL rather than the prototype's "Pending KCARs".
 */

export interface DomainCrossReference {
  domain: string;
  kcars: ReadonlyArray<Citation>;
  faa: ReadonlyArray<Citation>;
  easa: ReadonlyArray<Citation>;
  icao: ReadonlyArray<Citation>;
}

export const DOMAIN_CROSS_REFERENCE: ReadonlyArray<DomainCrossReference> = [
  {
    domain: 'Operations',
    kcars: [{ instrument: LN_29_2026 }],
    faa: [{ instrument: FAA_14_CFR_121 }],
    easa: [{ instrument: EASA_PART_CAT }],
    icao: [{ instrument: ICAO_ANNEX_6_I }],
  },
  {
    domain: 'AOC & OM Content',
    kcars: [
      { instrument: LN_42_2026, section: 'Third Schedule', subject: 'Binding OM content list' },
    ],
    faa: [{ instrument: FAA_14_CFR_119 }, { instrument: FAA_14_CFR_121, section: 'Subpart G' }],
    easa: [{ instrument: EASA_PART_ORO }],
    icao: [{ instrument: ICAO_DOC_8335 }],
  },
  {
    domain: 'Crew Licensing',
    kcars: [{ instrument: LN_31_2026 }],
    faa: [{ instrument: FAA_14_CFR_61 }],
    easa: [{ instrument: EASA_PART_FCL }],
    icao: [{ instrument: ICAO_ANNEX_1, subject: 'Personnel Licensing (Amdt 49)' }],
  },
  {
    domain: 'Training & Checking',
    kcars: [
      {
        instrument: LN_42_2026,
        section: 'Third Schedule §2.2',
        subject: 'Mandatory training topics',
      },
    ],
    faa: [{ instrument: FAA_14_CFR_121, section: 'Subparts N & O' }],
    easa: [{ instrument: EASA_AMC1_ORO_FC_230 }],
    icao: [{ instrument: ICAO_DOC_9868, subject: 'PANS-TRG' }],
  },
  {
    domain: 'FDAP / FOQA',
    kcars: [REG_56_2],
    faa: [{ instrument: FAA_AC_120_82 }],
    easa: [{ instrument: EASA_PART_ORO, section: 'ORO.AOC.130' }],
    icao: [{ instrument: ICAO_DOC_10000 }],
  },
  {
    domain: 'Safety Management Systems',
    kcars: [{ instrument: LN_30_2026 }],
    faa: [{ instrument: FAA_14_CFR_5 }],
    easa: [{ instrument: EASA_PART_ORO, section: 'ORO.GEN.200' }],
    icao: [{ instrument: ICAO_ANNEX_19 }, { instrument: ICAO_DOC_9859 }],
  },
  {
    domain: 'Fatigue Management / FRMS',
    kcars: [
      {
        instrument: LN_30_2026,
        subject: 'Partial coverage via SMS provisions; operator FRMS rollout is the action item',
      },
    ],
    faa: [{ instrument: FAA_14_CFR_117 }],
    easa: [{ instrument: EASA_PART_ORO, section: 'ORO.FTL' }],
    icao: [{ instrument: ICAO_DOC_9966 }],
  },
  {
    domain: 'CRM / Human Factors',
    kcars: [{ instrument: LN_42_2026, section: 'Third Schedule §2.2.4', subject: 'CRM' }],
    faa: [{ instrument: FAA_AC_120_51E }],
    easa: [{ instrument: EASA_PART_ORO, section: 'ORO.FC.115' }],
    icao: [{ instrument: ICAO_DOC_9683 }],
  },
  {
    domain: 'Aviation Security',
    kcars: [{ instrument: LN_31_2026, subject: 'AVSEC' }],
    faa: [{ instrument: FAA_14_CFR_121, section: 'Subpart Y' }],
    easa: [{ instrument: EASA_PART_ORO, section: 'ORO.SEC' }],
    icao: [{ instrument: ICAO_ANNEX_17 }],
  },
];
