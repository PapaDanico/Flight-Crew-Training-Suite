import { sql } from 'drizzle-orm';
import { jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { operatorStatusEnum } from './enums.js';

/**
 * Operators are the tenant root. Every other tenant-scoped table carries
 * operator_id as a FK and is protected by an RLS policy (see infra/migrations/0001).
 */
export const operators = pgTable('operators', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  legalName: text('legal_name').notNull(),
  tradingName: text('trading_name').notNull(),
  shortCode: text('short_code').notNull().unique(),
  aocNumber: text('aoc_number').notNull(),
  countryIso2: text('country_iso2').notNull().default('KE'),
  odpcRegistrationNumber: text('odpc_registration_number'),
  accountableManagerName: text('accountable_manager_name').notNull(),
  accountableManagerEmail: text('accountable_manager_email').notNull(),
  status: operatorStatusEnum('status').notNull().default('active'),
  config: jsonb('config').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type OperatorRow = typeof operators.$inferSelect;
export type OperatorInsert = typeof operators.$inferInsert;
