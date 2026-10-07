import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  numeric,
  uniqueIndex,
  index,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';
import { programs } from './programs';
export const aiUsage = pgTable(
  'ai_usage',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    feature: text('feature').notNull(),
    model: text('model').notNull(),
    inputTokens: integer('input_tokens'),
    outputTokens: integer('output_tokens'),
    estimatedCost: numeric('estimated_cost', { precision: 14, scale: 8 }),
    status: text('status').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('ai_usage_user_feature_created_idx').on(
      t.userId,
      t.feature,
      t.createdAt,
    ),
    check('ai_usage_feature_valid', sql`${t.feature}='workout_plan_import'`),
    check(
      'ai_usage_status_valid',
      sql`${t.status} IN ('started','succeeded','failed','invalid_output','no_program','timeout')`,
    ),
    check(
      'ai_usage_tokens_valid',
      sql`(${t.inputTokens} IS NULL OR ${t.inputTokens}>=0) AND (${t.outputTokens} IS NULL OR ${t.outputTokens}>=0)`,
    ),
    check(
      'ai_usage_cost_valid',
      sql`${t.estimatedCost} IS NULL OR ${t.estimatedCost}>=0`,
    ),
  ],
);
/** Minimal durable confirmation ledger, not a server-side document/review store. */
export const importConfirmations = pgTable(
  'import_confirmations',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    confirmationKey: uuid('confirmation_key').notNull(),
    importId: uuid('import_id')
      .notNull()
      .references(() => aiUsage.id, { onDelete: 'cascade' }),
    programId: uuid('program_id').references(() => programs.id, {
      onDelete: 'set null',
    }),
    payloadHash: text('payload_hash').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('import_confirmations_user_key_unique').on(
      t.userId,
      t.confirmationKey,
    ),
    uniqueIndex('import_confirmations_user_import_unique').on(
      t.userId,
      t.importId,
    ),
    check('import_confirmations_hash_valid', sql`length(${t.payloadHash})=64`),
  ],
);
