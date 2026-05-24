import { sql } from 'drizzle-orm';
import {
  boolean,
  date,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  index,
} from 'drizzle-orm/pg-core';
import { pilotRoleEnum, trainingPhaseEnum } from './enums.js';
import { fleets } from './aircraft.js';
import { operators } from './operator.js';

export const pilots = pgTable(
  'pilots',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    operatorId: uuid('operator_id')
      .notNull()
      .references(() => operators.id, { onDelete: 'restrict' }),
    fleetId: uuid('fleet_id')
      .notNull()
      .references(() => fleets.id, { onDelete: 'restrict' }),
    fullName: text('full_name').notNull(),
    licenceNumber: text('licence_number').notNull(),
    role: pilotRoleEnum('role').notNull(),
    baseIcao: text('base_icao').notNull(),
    phase: trainingPhaseEnum('phase').notNull(),
    employeeId: text('employee_id'),
    hireDate: date('hire_date'),
    dateOfBirth: date('date_of_birth'),
    totalHours: integer('total_hours'),
    typeHours: integer('type_hours'),
    picHours: integer('pic_hours'),
    emergencyContactName: text('emergency_contact_name'),
    emergencyContactPhone: text('emergency_contact_phone'),
    active: boolean('active').notNull().default(true),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    deletionReason: text('deletion_reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    operatorIdx: index('pilots_operator_idx').on(t.operatorId),
    licenceUx: uniqueIndex('pilots_licence_ux').on(t.operatorId, t.licenceNumber),
  }),
);

export type PilotRow = typeof pilots.$inferSelect;
export type PilotInsert = typeof pilots.$inferInsert;
