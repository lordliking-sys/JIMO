import {
  workoutOperationSchema,
  type WorkoutOperation,
  type SyncResponse,
} from '@jimo/schemas';
import type { LocalDatabase, SqlExecutor } from '../database';
export type OutboxRow = {
  operation_id: string;
  session_id: string;
  sequence: number;
  payload: string;
  status: 'pending' | 'syncing' | 'failed' | 'conflict';
  attempt_count: number;
  last_error: string | null;
};
export async function enqueue(
  sql: SqlExecutor,
  owner: string,
  input: Omit<WorkoutOperation, 'sequence'>,
) {
  const key = `sequence:${input.sessionId}`;
  const current = (
    await sql.all<{ value: string }>(
      'SELECT value FROM sync_metadata WHERE owner_user_id=? AND key=?',
      [owner, key],
    )
  )[0];
  const sequence = Number(current?.value ?? 0) + 1,
    operation = workoutOperationSchema.parse({ ...input, sequence });
  await sql.run(
    'INSERT INTO sync_metadata VALUES(?,?,?) ON CONFLICT(owner_user_id,key) DO UPDATE SET value=excluded.value',
    [owner, key, String(sequence)],
  );
  await sql.run(
    'INSERT INTO sync_outbox(owner_user_id,operation_id,session_id,entity_id,operation_type,sequence,created_at,payload) VALUES(?,?,?,?,?,?,?,?)',
    [
      owner,
      operation.operationId,
      operation.sessionId,
      operation.entityId,
      operation.operationType,
      sequence,
      operation.createdAt,
      JSON.stringify(operation),
    ],
  );
}
export class SyncOutboxRepository {
  constructor(private db: LocalDatabase) {}
  async list(owner: string) {
    return this.db.access((sql) =>
      sql.all<OutboxRow>(
        'SELECT * FROM sync_outbox WHERE owner_user_id=? ORDER BY rowid',
        [owner],
      ),
    );
  }
  async batch(owner: string) {
    return this.db.transaction(async (sql) => {
      const rows = await sql.all<OutboxRow>(
        `SELECT * FROM sync_outbox o WHERE owner_user_id=? AND status='pending'
    AND NOT EXISTS(SELECT 1 FROM sync_outbox b WHERE b.owner_user_id=o.owner_user_id AND b.session_id=o.session_id AND b.status IN ('failed','conflict'))
    ORDER BY (SELECT min(b.rowid) FROM sync_outbox b WHERE b.owner_user_id=o.owner_user_id AND b.session_id=o.session_id),o.session_id,o.sequence LIMIT 50`,
        [owner],
      );
      for (const row of rows)
        await sql.run(
          "UPDATE sync_outbox SET status='syncing',attempt_count=attempt_count+1,last_attempt_at=? WHERE owner_user_id=? AND operation_id=?",
          [new Date().toISOString(), owner, row.operation_id],
        );
      return rows.map((r) =>
        workoutOperationSchema.parse(JSON.parse(r.payload)),
      );
    });
  }
  async acknowledge(
    owner: string,
    batch: WorkoutOperation[],
    result: SyncResponse,
  ) {
    const sent = new Map(batch.map((o) => [o.operationId, o]));
    if (
      result.acknowledged.some((id) => !sent.has(id)) ||
      result.failed.some(
        (f) => sent.get(f.operationId)?.sessionId !== f.sessionId,
      )
    )
      throw new Error('INVALID_SYNC_RESPONSE');
    // An ACK may never jump over an earlier unacknowledged operation in a session.
    const acknowledged = new Set(result.acknowledged),
      blocked = new Set<string>();
    for (const op of batch) {
      if (!acknowledged.has(op.operationId)) blocked.add(op.sessionId);
      else if (blocked.has(op.sessionId))
        throw new Error('INVALID_SYNC_ACK_ORDER');
    }
    await this.db.transaction(async (sql) => {
      for (const operation of batch) {
        const failure = result.failed.find(
          (f) => f.operationId === operation.operationId,
        );
        if (acknowledged.has(operation.operationId))
          await sql.run(
            'DELETE FROM sync_outbox WHERE owner_user_id=? AND operation_id=?',
            [owner, operation.operationId],
          );
        else
          await sql.run(
            'UPDATE sync_outbox SET status=?,last_error=? WHERE owner_user_id=? AND operation_id=?',
            [
              failure?.status === 'retry'
                ? 'pending'
                : (failure?.status ?? 'pending'),
              failure?.code ?? null,
              owner,
              operation.operationId,
            ],
          );
      }
      if (result.acknowledged.length)
        await sql.run(
          'INSERT INTO sync_metadata VALUES(?,?,?) ON CONFLICT(owner_user_id,key) DO UPDATE SET value=excluded.value',
          [owner, 'lastSuccessfulSyncAt', new Date().toISOString()],
        );
    });
  }
  async release(
    owner: string,
    batch: WorkoutOperation[],
    code: string,
    permanent = false,
  ) {
    await this.db.transaction(async (sql) => {
      for (const op of batch)
        await sql.run(
          "UPDATE sync_outbox SET status=?,last_error=? WHERE owner_user_id=? AND operation_id=? AND status='syncing'",
          [permanent ? 'failed' : 'pending', code, owner, op.operationId],
        );
    });
  }
}
