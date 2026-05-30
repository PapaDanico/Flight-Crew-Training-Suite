import { pgEnum } from 'drizzle-orm/pg-core';
import {
  AUDIT_ACTION,
  CURRENCY_CATEGORY,
  CURRENCY_KIND,
  CURRENCY_STATUS,
  DOCUMENT_KIND,
  DOCUMENT_VERSION_STATUS,
  ICAO_COMPETENCY,
  OPERATOR_GRADE,
  PILOT_ROLE,
  ROLE,
  SESSION_KIND,
  SESSION_VENUE,
  TRAINING_PHASE,
} from '@dnca/domain';

export const pilotRoleEnum = pgEnum('pilot_role', PILOT_ROLE);
export const trainingPhaseEnum = pgEnum('training_phase', TRAINING_PHASE);

export const currencyCategoryEnum = pgEnum('currency_category', CURRENCY_CATEGORY);
export const currencyKindEnum = pgEnum('currency_kind', CURRENCY_KIND);
export const currencyStatusEnum = pgEnum('currency_status', CURRENCY_STATUS);

export const icaoCompetencyEnum = pgEnum('icao_competency', ICAO_COMPETENCY);
export const operatorGradeEnum = pgEnum('operator_grade', OPERATOR_GRADE);
export const gradeScaleEnum = pgEnum('grade_scale', ['AS-S-MS-BS', 'ICAO-1-5', 'NOT_OBSERVED']);

export const sessionKindEnum = pgEnum('session_kind', SESSION_KIND);
export const sessionVenueEnum = pgEnum('session_venue', SESSION_VENUE);
export const sessionStatusEnum = pgEnum('session_status', [
  'DRAFT',
  'COMPLETED',
  'SIGNED_OFF',
  'VOIDED',
]);

export const signOffRoleEnum = pgEnum('sign_off_role', ['TRI', 'TRE', 'LCE', 'LTC', 'HOT']);

export const documentKindEnum = pgEnum('document_kind', DOCUMENT_KIND);
export const documentVersionStatusEnum = pgEnum('document_version_status', DOCUMENT_VERSION_STATUS);

export const userRoleEnum = pgEnum('user_role', ROLE);
export const auditActionEnum = pgEnum('audit_action', AUDIT_ACTION);

export const operatorStatusEnum = pgEnum('operator_status', ['active', 'inactive', 'archived']);
export const fleetVariantEnum = pgEnum('fleet_variant', ['F70', 'F70-HGW', 'F100', 'B737']);
