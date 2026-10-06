import {
  pgTable,
  uuid,
  text,
  boolean,
  index,
  uniqueIndex,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';
import { auditColumns } from './columns';
import { trackingModeEnum, loadModeEnum } from './enums';
export const exercises = pgTable(
  'exercises',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    createdByUserId: uuid('created_by_user_id').references(() => users.id, {
      onDelete: 'restrict',
    }),
    canonicalName: text('canonical_name').notNull(),
    slug: text('slug'),
    isCustom: boolean('is_custom').notNull().default(false),
    trackingMode: trackingModeEnum('tracking_mode').notNull().default('reps'),
    defaultLoadMode: loadModeEnum('default_load_mode'),
    ...auditColumns(),
  },
  (table) => [
    index('exercises_owner_idx').on(table.createdByUserId),
    uniqueIndex('exercises_system_slug_unique')
      .on(table.slug)
      .where(sql`${table.isCustom} = false`),
    uniqueIndex('exercises_custom_slug_unique')
      .on(table.createdByUserId, table.slug)
      .where(sql`${table.isCustom} = true`),
    check(
      'exercises_name_valid',
      sql`length(trim(${table.canonicalName})) BETWEEN 1 AND 160`,
    ),
    check(
      'exercises_owner_consistent',
      sql`(${table.isCustom} AND ${table.createdByUserId} IS NOT NULL) OR (NOT ${table.isCustom} AND ${table.createdByUserId} IS NULL)`,
    ),
  ],
);
