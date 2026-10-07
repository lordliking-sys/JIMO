import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  uniqueIndex,
  index,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';
import { workoutSessions } from './workouts';
export const syncOperations = pgTable(
  'sync_operations',
  {
    operationId: uuid('operation_id').notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => workoutSessions.id, { onDelete: 'cascade' }),
    entityId: uuid('entity_id').notNull(),
    operationType: text('operation_type').notNull(),
    sequence: integer('sequence').notNull(),
    payloadHash: text('payload_hash').notNull(),
    processedAt: timestamp('processed_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('sync_operations_user_operation_unique').on(
      t.userId,
      t.operationId,
    ),
    uniqueIndex('sync_operations_session_sequence_unique').on(
      t.userId,
      t.sessionId,
      t.sequence,
    ),
    index('sync_operations_session_idx').on(t.sessionId),
    check('sync_operations_sequence_valid', sql`${t.sequence}>0`),
    check(
      'sync_operations_type_valid',
      sql`${t.operationType} IN ('START_WORKOUT','COMPLETE_SET','UPDATE_SET','SKIP_SET','COMPLETE_WORKOUT','CANCEL_WORKOUT')`,
    ),
  ],
);
