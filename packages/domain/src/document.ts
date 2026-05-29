import type {
  DocumentId,
  DocumentVersionId,
  IsoDate,
  IsoDateTime,
  KCAASubmissionId,
  OperatorId,
  UserId,
} from './branded.js';
import { daysBetween } from './currency.js';

export const DOCUMENT_KIND = [
  'OM_A',
  'OM_B',
  'OM_C',
  'OM_D',
  'TRAINING_PROGRAMME_ITR',
  'TRAINING_PROGRAMME_RECURRENT',
  'CHECKLIST',
  'QRH_OPERATOR_SUPPLEMENT',
  'TECHNICAL_LOG_TEMPLATE',
  'KCAA_TRANSMITTAL',
  'OTHER',
] as const;
export type DocumentKind = (typeof DOCUMENT_KIND)[number];

export interface Document {
  id: DocumentId;
  operatorId: OperatorId;
  kind: DocumentKind;
  title: string;
  shortCode: string;
  ownerUserId: UserId;
  currentVersionId?: DocumentVersionId;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export const DOCUMENT_VERSION_STATUS = [
  'DRAFT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'APPROVED',
  'RETURNED_FOR_REVISION',
  'SUPERSEDED',
  'WITHDRAWN',
] as const;
export type DocumentVersionStatus = (typeof DOCUMENT_VERSION_STATUS)[number];

export interface DocumentVersion {
  id: DocumentVersionId;
  documentId: DocumentId;
  operatorId: OperatorId;
  versionLabel: string;
  status: DocumentVersionStatus;
  contentHash: string;
  plannedImplementationDate?: IsoDate;
  submissionDeadline?: IsoDate;
  submittedAt?: IsoDateTime;
  approvedAt?: IsoDateTime;
  createdByUserId: UserId;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface DocumentPage {
  documentVersionId: DocumentVersionId;
  pageNumber: number;
  revisionLabel: string;
  lastRevisedAt: IsoDateTime;
  contentHash: string;
}

/**
 * KCAA submission for a document version. Reg 17(3) requires 30 days lead time:
 * submissionDeadline = plannedImplementationDate - 30 days. The platform must
 * calculate this and prevent submission less than 30 days out without an
 * explicit override flag captured in the audit log.
 */
export interface KCAASubmission {
  id: KCAASubmissionId;
  operatorId: OperatorId;
  documentVersionId: DocumentVersionId;
  submittedByUserId: UserId;
  submittedAt: IsoDateTime;
  transmittalLetterUrl: string;
  receiptNumber?: string;
  reviewerOfficer?: string;
  approvedAt?: IsoDateTime;
  rejectedAt?: IsoDateTime;
  rejectionReason?: string;
}

export const REG_17_3_LEAD_DAYS = 30 as const;

export function calculateSubmissionDeadline(plannedImplementation: Date): Date {
  // Compute in UTC. IsoDate values are parsed as UTC midnight, so local-time
  // getDate()/setDate() would shift the Reg 17(3) deadline by a day on any
  // server not running in UTC — a regulatory date must not drift.
  const d = new Date(plannedImplementation);
  d.setUTCDate(d.getUTCDate() - REG_17_3_LEAD_DAYS);
  return d;
}

function toIsoDate(d: Date): IsoDate {
  return d.toISOString().slice(0, 10) as IsoDate;
}

/**
 * Reg 17(3) submission-readiness assessment for a planned implementation date.
 * The submission deadline is 30 days before implementation; submitting on or
 * before it is on time, and submitting after it requires an explicit, audited
 * override (implementation before approval remains prohibited regardless).
 */
export interface SubmissionReadiness {
  readonly plannedImplementation: IsoDate;
  readonly submissionDeadline: IsoDate;
  readonly asOf: IsoDate;
  /** Days from asOf to the deadline; ≥ 0 means there is still time. */
  readonly daysUntilDeadline: number;
  readonly onTime: boolean;
  /** True when submitting as of `asOf` is inside the 30-day window. */
  readonly requiresOverride: boolean;
}

export function assessSubmissionReadiness(args: {
  plannedImplementation: IsoDate;
  asOf: IsoDate;
}): SubmissionReadiness {
  const deadline = toIsoDate(
    calculateSubmissionDeadline(new Date(`${args.plannedImplementation}T00:00:00Z`)),
  );
  const daysUntilDeadline = daysBetween(args.asOf, deadline);
  const onTime = daysUntilDeadline >= 0;
  return {
    plannedImplementation: args.plannedImplementation,
    submissionDeadline: deadline,
    asOf: args.asOf,
    daysUntilDeadline,
    onTime,
    requiresOverride: !onTime,
  };
}

/**
 * Letter of Effective Pages — auto-generated from the pages of a document
 * version. Rows are ordered by page number; the effective date is the most
 * recent page revision (manuals are versioned per page, not per document).
 */
export interface LepRow {
  readonly pageNumber: number;
  readonly revisionLabel: string;
  readonly lastRevisedAt: IsoDateTime;
}

export interface LetterOfEffectivePages {
  readonly rows: ReadonlyArray<LepRow>;
  readonly pageCount: number;
  /** Most recent page-revision date across the version, or null if no pages. */
  readonly effectiveDate: IsoDate | null;
}

export function buildLetterOfEffectivePages(
  pages: ReadonlyArray<DocumentPage>,
): LetterOfEffectivePages {
  const rows: LepRow[] = [...pages]
    .sort((a, b) => a.pageNumber - b.pageNumber)
    .map((p) => ({
      pageNumber: p.pageNumber,
      revisionLabel: p.revisionLabel,
      lastRevisedAt: p.lastRevisedAt,
    }));
  let effectiveMs = Number.NEGATIVE_INFINITY;
  for (const p of pages) {
    const ms = Date.parse(p.lastRevisedAt);
    if (ms > effectiveMs) effectiveMs = ms;
  }
  return {
    rows,
    pageCount: rows.length,
    effectiveDate: rows.length === 0 ? null : toIsoDate(new Date(effectiveMs)),
  };
}
