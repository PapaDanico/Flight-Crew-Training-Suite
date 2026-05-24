import { sql } from 'drizzle-orm';
import { date, index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { currencyKindEnum } from './enums.js';
import { operators } from './operator.js';
import { pilots } from './pilot.js';
// sessions FK is added in training.ts via a separate currency_source_session column
// to avoid a circular import at module load.

export const currencyRecords = pgTable(
  'currency_records',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    operatorId: uuid('operator_id')
      .notNull()
      .references(() => operators.id, { onDelete: 'restrict' }),
    pilotId: uuid('pilot_id')
      .notNull()
      .references(() => pilots.id, { onDelete: 'restrict' }),
    kind: currencyKindEnum('kind').notNull(),
    validFrom: date('valid_from').notNull(),
    validTo: date('valid_to').notNull(),
    sourceSessionId: uuid('source_session_id'),
    issuedByUserId: uuid('issued_by_user_id'),
    notes: text('notes'),
    attachmentUrls: jsonb('attachment_urls').$type<readonly string[]>(),
    supersededAt: timestamp('superseded_at', { withTimezone: true }),
    supersededBy: uuid('superseded_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pilotKindIdx: index('currency_records_pilot_kind_idx').on(t.pilotId, t.kind),
    operatorIdx: index('currency_records_operator_idx').on(t.operatorId),
    validToIdx: index('currency_records_valid_to_idx').on(t.validTo),
  }),
);

export type CurrencyRecordRow = typeof currencyRecords.$inferSelect;
export type CurrencyRecordInsert = typeof currencyRecords.$inferInsert;
