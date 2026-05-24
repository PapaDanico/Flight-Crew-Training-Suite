/**
 * ICAO Doc 9868 PANS-TRG defines eight core CBTA competencies. Per Phase-0 audit
 * §4.1 / CLAUDE.md §"CBTA competency grading", every exercise grades ALL eight
 * via observable behaviours — not a single competency per exercise as an earlier
 * prototype implemented via regex.
 */
export const ICAO_COMPETENCY = [
  'APPLICATION_OF_PROCEDURES',
  'COMMUNICATION',
  'FLIGHT_PATH_AUTOMATION',
  'FLIGHT_PATH_MANUAL',
  'LEADERSHIP_TEAMWORK',
  'PROBLEM_SOLVING_DECISION_MAKING',
  'SITUATION_AWARENESS',
  'WORKLOAD_MANAGEMENT',
] as const;
export type IcaoCompetency = (typeof ICAO_COMPETENCY)[number];

export const COMPETENCY_LABEL: Readonly<Record<IcaoCompetency, string>> = {
  APPLICATION_OF_PROCEDURES: 'Application of Procedures',
  COMMUNICATION: 'Communication',
  FLIGHT_PATH_AUTOMATION: 'Aeroplane Flight Path Management (Automation)',
  FLIGHT_PATH_MANUAL: 'Aeroplane Flight Path Management (Manual Control)',
  LEADERSHIP_TEAMWORK: 'Leadership & Teamwork',
  PROBLEM_SOLVING_DECISION_MAKING: 'Problem Solving & Decision Making',
  SITUATION_AWARENESS: 'Situation Awareness',
  WORKLOAD_MANAGEMENT: 'Workload Management',
};

/**
 * Operator grading scales. Alignment between AS/S/MS/BS and ICAO 1-5 is an open
 * domain question (CLAUDE.md "Open questions" #1).
 */
export const OPERATOR_GRADE = ['AS', 'S', 'MS', 'BS'] as const;
export type OperatorGrade = (typeof OPERATOR_GRADE)[number];

export const ICAO_GRADE = [1, 2, 3, 4, 5] as const;
export type IcaoGrade = (typeof ICAO_GRADE)[number];

export const OPERATOR_GRADE_MEANING: Readonly<Record<OperatorGrade, string>> = {
  AS: 'Above Standard — consistently exceeds required standard',
  S: 'Standard — meets required standard',
  MS: 'Minimum Standard — meets but needs reinforcement; remedial advised',
  BS: 'Below Standard — does not meet; mandatory remedial & re-check',
};

export type Grade =
  | { scale: 'AS-S-MS-BS'; value: OperatorGrade }
  | { scale: 'ICAO-1-5'; value: IcaoGrade }
  | { scale: 'NOT_OBSERVED'; reason: string };
