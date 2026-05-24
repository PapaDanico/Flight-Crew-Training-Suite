import { sql } from 'drizzle-orm';
import {
  boolean,
  date,
  integer,
  pgTable,
  text,
  uuid,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { fleetVariantEnum } from './enums.js';
import { operators } from './operator.js';

export const fleets = pgTable(
  'fleets',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    operatorId: uuid('operator_id')
      .notNull()
      .references(() => operators.id, { onDelete: 'restrict' }),
    variant: fleetVariantEnum('variant').notNull(),
    displayName: text('display_name').notNull(),
    active: boolean('active').notNull().default(true),
  },
  (t) => ({
    operatorIdx: index('fleets_operator_idx').on(t.operatorId),
  }),
);

export const aircraft = pgTable(
  'aircraft',
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
    registration: text('registration').notNull(),
    variant: fleetVariantEnum('variant').notNull(),
    mtowKg: integer('mtow_kg').notNull(),
    mlwKg: integer('mlw_kg').notNull(),
    mzfwKg: integer('mzfw_kg').notNull(),
    serialNumber: text('serial_number'),
    deliveredOn: date('delivered_on'),
    active: boolean('active').notNull().default(true),
  },
  (t) => ({
    operatorIdx: index('aircraft_operator_idx').on(t.operatorId),
    registrationUx: uniqueIndex('aircraft_registration_ux').on(t.operatorId, t.registration),
  }),
);

export type FleetRow = typeof fleets.$inferSelect;
export type AircraftRow = typeof aircraft.$inferSelect;
