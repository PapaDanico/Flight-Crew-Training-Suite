import { sql } from 'drizzle-orm';
import {
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { documentKindEnum, documentVersionStatusEnum } from './enums.js';
import { operators } from './operator.js';

export const documents = pgTable(
  'documents',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    operatorId: uuid('operator_id')
      .notNull()
      .references(() => operators.id, { onDelete: 'restrict' }),
    kind: documentKindEnum('kind').notNull(),
    title: text('title').notNull(),
    shortCode: text('short_code').notNull(),
    ownerUserId: uuid('owner_user_id').notNull(),
    currentVersionId: uuid('current_version_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    operatorShortCodeUx: uniqueIndex('documents_operator_short_code_ux').on(
      t.operatorId,
      t.shortCode,
    ),
  }),
);

export const documentVersions = pgTable(
  'document_versions',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    documentId: uuid('document_id')
      .notNull()
      .references(() => documents.id, { onDelete: 'cascade' }),
    operatorId: uuid('operator_id')
      .notNull()
      .references(() => operators.id, { onDelete: 'restrict' }),
    versionLabel: text('version_label').notNull(),
    status: documentVersionStatusEnum('status').notNull().default('DRAFT'),
    contentHash: text('content_hash').notNull(),
    plannedImplementationDate: date('planned_implementation_date'),
    submissionDeadline: date('submission_deadline'),
    submittedAt: timestamp('submitted_at', { withTimezone: true }),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    createdByUserId: uuid('created_by_user_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    documentIdx: index('document_versions_document_idx').on(t.documentId),
    statusIdx: index('document_versions_status_idx').on(t.status),
  }),
);

export const documentPages = pgTable(
  'document_pages',
  {
    documentVersionId: uuid('document_version_id')
      .notNull()
      .references(() => documentVersions.id, { onDelete: 'cascade' }),
    operatorId: uuid('operator_id')
      .notNull()
      .references(() => operators.id, { onDelete: 'restrict' }),
    pageNumber: integer('page_number').notNull(),
    revisionLabel: text('revision_label').notNull(),
    lastRevisedAt: timestamp('last_revised_at', { withTimezone: true }).notNull(),
    contentHash: text('content_hash').notNull(),
  },
  (t) => ({
    pk: uniqueIndex('document_pages_pk').on(t.documentVersionId, t.pageNumber),
    operatorIdx: index('document_pages_operator_idx').on(t.operatorId),
  }),
);

export const kcaaSubmissions = pgTable('kcaa_submissions', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  operatorId: uuid('operator_id')
    .notNull()
    .references(() => operators.id, { onDelete: 'restrict' }),
  documentVersionId: uuid('document_version_id')
    .notNull()
    .references(() => documentVersions.id, { onDelete: 'restrict' }),
  submittedByUserId: uuid('submitted_by_user_id').notNull(),
  submittedAt: timestamp('submitted_at', { withTimezone: true }).notNull().defaultNow(),
  transmittalLetterUrl: text('transmittal_letter_url').notNull(),
  receiptNumber: text('receipt_number'),
  reviewerOfficer: text('reviewer_officer'),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  rejectedAt: timestamp('rejected_at', { withTimezone: true }),
  rejectionReason: text('rejection_reason'),
});

export type DocumentRow = typeof documents.$inferSelect;
export type DocumentVersionRow = typeof documentVersions.$inferSelect;
export type DocumentPageRow = typeof documentPages.$inferSelect;
export type KCAASubmissionRow = typeof kcaaSubmissions.$inferSelect;
