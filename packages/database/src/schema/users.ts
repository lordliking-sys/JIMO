import { pgTable, uuid, text, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { auditColumns } from './columns';
import { unitSystemEnum } from './enums';
export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    displayName: text('display_name'),
    locale: text('locale').notNull().default('system'),
    unitSystem: unitSystemEnum('unit_system').notNull().default('metric'),
    ...auditColumns(),
  },
  (table) => [
    check(
      'users_display_name_valid',
      sql`${table.displayName} IS NULL OR length(trim(${table.displayName})) BETWEEN 1 AND 120`,
    ),
  ],
);
