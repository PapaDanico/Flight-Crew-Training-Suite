import type {
  DocumentId,
  DocumentVersionId,
  IsoDate,
  IsoDateTime,
  KCAASubmissionId,
  OperatorId,
  UserId,
} from './branded.js';

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
  const d = new Date(plannedImplementation);
  d.setDate(d.getDate() - REG_17_3_LEAD_DAYS);
  return d;
}
