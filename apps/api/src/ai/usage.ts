import { randomUUID } from 'node:crypto';
import type { DatabaseClient } from '@jimo/database';
import { ApiError } from '../errors';
export class AiUsageService {
  constructor(
    private client: DatabaseClient,
    private daily = 10,
    private hourly = 3,
  ) {}
  /** Quota is reserved atomically across API processes; failed requests count. */
  async canUseAiFeature(
    userId: string,
    feature: 'workout_plan_import',
    model: string,
  ) {
    const id = randomUUID(),
      q = this.client.sqlClient.query;
    const rows = await this.client.sqlClient.transaction([
      q('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [
        userId + ':ai',
      ]),
      q(
        `INSERT INTO ai_usage(id,user_id,feature,model,status) SELECT $1::uuid,$2::uuid,$3,$4,'started' WHERE (SELECT count(*) FROM ai_usage WHERE user_id=$2::uuid AND feature=$3 AND created_at>now()-interval '24 hours')<$5 AND (SELECT count(*) FROM ai_usage WHERE user_id=$2::uuid AND feature=$3 AND created_at>now()-interval '1 hour')<$6 RETURNING id`,
        [id, userId, feature, model, this.daily, this.hourly],
      ),
    ]);
    if (!rows[1]?.length)
      throw new ApiError(429, 'AI_RATE_LIMITED', 'Import limit reached');
    return id;
  }
  async finish(
    id: string,
    status: string,
    inputTokens?: number,
    outputTokens?: number,
  ) {
    await this.client.sqlClient.query(
      'UPDATE ai_usage SET status=$2,input_tokens=$3,output_tokens=$4 WHERE id=$1::uuid',
      [id, status, inputTokens ?? null, outputTokens ?? null],
    );
  }
}
