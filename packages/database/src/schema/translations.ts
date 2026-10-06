import { pgTable, uuid, text, primaryKey, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { exercises } from './exercises';
import { auditColumns } from './columns';
export const exerciseTranslations = pgTable(
  'exercise_translations',
  {
    exerciseId: uuid('exercise_id')
      .notNull()
      .references(() => exercises.id, { onDelete: 'cascade' }),
    locale: text('locale').notNull(),
    name: text('name').notNull(),
    ...auditColumns(),
  },
  (t) => [
    primaryKey({ columns: [t.exerciseId, t.locale] }),
    check(
      'exercise_translations_name_valid',
      sql`length(trim(${t.name})) BETWEEN 1 AND 160`,
    ),
    check(
      'exercise_translations_locale_valid',
      sql`length(${t.locale}) BETWEEN 2 AND 35`,
    ),
  ],
);
