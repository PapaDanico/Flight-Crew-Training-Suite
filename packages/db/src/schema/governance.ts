import { sql } from 'drizzle-orm';
import { boolean, index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { auditActionEnum, userRoleEnum } from './enums.js';
import { operators } from './operator.js';

export const users = pgTable(
  'users',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    email: text('email').notNull().unique(),
    fullName: text('full_name').notNull(),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    emailIdx: index('users_email_idx').on(t.email),
  }),
);

export const roleAssignments = pgTable(
  'role_assignments',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    operatorId: uuid('operator_id').references(() => operators.id, { onDelete: 'restrict' }),
    role: userRoleEnum('role').notNull(),
    grantedByUserId: uuid('granted_by_user_id').notNull(),
    grantedAt: timestamp('granted_at', { withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
  },
  (t) => ({
    userOperatorIdx: index('role_assignments_user_operator_idx').on(t.userId, t.operatorId),
    activeIdx: index('role_assignments_active_idx')
      .on(t.userId, t.role)
      .where(sql`${t.revokedAt} IS NULL`),
  }),
);

/**
 * Append-only audit log. Postgres triggers (see infra/migrations/0001) reject
 * UPDATE and DELETE on this table regardless of role. See ADR 0003.
 *
 * operator_id is nullable for global events (auth pre-tenant-resolution,
 * platform-admin actions).
 */
export const auditEvents = pgTable(
  'audit_events',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    operatorId: uuid('operator_id').references(() => operators.id, { onDelete: 'restrict' }),
    actorUserId: uuid('actor_user_id'),
    actorRole: userRoleEnum('actor_role'),
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id').notNull(),
    action: auditActionEnum('action').notNull(),
    beforeState: jsonb('before_state'),
    afterState: jsonb('after_state'),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
    requestId: text('request_id').notNull(),
    ipAddress: text('ip_address').notNull(),
    userAgent: text('user_agent'),
  },
  (t) => ({
    operatorIdx: index('audit_events_operator_idx').on(t.operatorId),
    entityIdx: index('audit_events_entity_idx').on(t.entityType, t.entityId),
    occurredAtIdx: index('audit_events_occurred_at_idx').on(t.occurredAt),
    actorIdx: index('audit_events_actor_idx').on(t.actorUserId),
  }),
);

export type UserRow = typeof users.$inferSelect;
export type RoleAssignmentRow = typeof roleAssignments.$inferSelect;
export type AuditEventRow = typeof auditEvents.$inferSelect;
export type AuditEventInsert = typeof auditEvents.$inferInsert;
