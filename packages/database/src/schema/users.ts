import {
  pgTable,
  uuid,
  text,
  check,
  unique,
  timestamp,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { auditColumns } from './columns';
import { unitSystemEnum } from './enums';
export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    displayName: text('display_name'),
    authProvider: text('auth_provider'),
    authSubject: text('auth_subject'),
    profileInitializedAt: timestamp('profile_initialized_at', {
      withTimezone: true,
    }),
    locale: text('locale').notNull().default('system'),
    unitSystem: unitSystemEnum('unit_system').notNull().default('metric'),
    ...auditColumns(),
  },
  (table) => [
    unique('users_auth_identity_unique').on(
      table.authProvider,
      table.authSubject,
    ),
    check(
      'users_auth_identity_valid',
      sql`(${table.authProvider} IS NULL AND ${table.authSubject} IS NULL) OR (${table.authProvider} IS NOT NULL AND ${table.authSubject} IS NOT NULL AND length(trim(${table.authProvider})) BETWEEN 1 AND 64 AND length(trim(${table.authSubject})) BETWEEN 1 AND 255)`,
    ),
    check(
      'users_display_name_valid',
      sql`${table.displayName} IS NULL OR length(trim(${table.displayName})) BETWEEN 1 AND 120`,
    ),
  ],
);
