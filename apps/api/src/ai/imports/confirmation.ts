import { createHash, randomUUID } from 'node:crypto';
import {
  importConfirmationSchema,
  prescriptionFor,
  type ImportConfirmation,
  type Prescription,
} from '@jimo/schemas';
import type { DatabaseClient } from '@jimo/database';
import { ProgramService, prescriptionPayload } from '../../program-service';
import { ApiError } from '../../errors';
/** Everything is one Neon HTTP transaction: no program is written during extraction. */
export class ImportConfirmationService {
  constructor(private client: DatabaseClient) {}
  async confirm(userId: string, input: ImportConfirmation, locale: string) {
    const value = importConfirmationSchema.parse(input);
    const hash = createHash('sha256')
      .update(
        JSON.stringify({
          importId: value.importId,
          program: value.program,
          days: value.days,
        }),
      )
      .digest('hex');
    const previous = await this.client.sqlClient.query(
      'SELECT program_id,payload_hash FROM import_confirmations WHERE user_id=$1::uuid AND (confirmation_key=$2::uuid OR import_id=$3::uuid)',
      [userId, value.confirmationKey, value.importId],
    );
    if (previous.length) return this.replay(userId, previous[0]!, hash, locale);
    const authorized = await this.client.sqlClient.query(
      "SELECT id FROM ai_usage WHERE id=$1::uuid AND user_id=$2::uuid AND status='succeeded'",
      [value.importId, userId],
    );
    if (!authorized.length)
      throw new ApiError(404, 'IMPORT_NOT_FOUND', 'Import not found');
    const ids = [
      ...new Set(
        value.days.flatMap((d) =>
          d.exercises.flatMap((e) => (e.exerciseId ? [e.exerciseId] : [])),
        ),
      ),
    ];
    const owned = ids.length
      ? await this.client.sqlClient.query(
          'SELECT id,tracking_mode FROM exercises WHERE id=ANY($1::uuid[]) AND (NOT is_custom OR created_by_user_id=$2::uuid)',
          [ids, userId],
        )
      : [];
    const trackingById = new Map(
      owned.map((e) => [String(e.id), e.tracking_mode as 'reps' | 'duration']),
    );
    if (ids.some((id) => !trackingById.has(id)))
      throw new ApiError(404, 'NOT_FOUND', 'Exercise not found');
    const id = randomUUID(),
      q = this.client.sqlClient.query;
    const commands = [
      q('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [
        userId + ':import:' + value.importId,
      ]),
      q('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [
        userId + ':key:' + value.confirmationKey,
      ]),
      q(
        `INSERT INTO programs(id,user_id,name,description,duration_weeks,starts_on,status) SELECT $1::uuid,$2::uuid,$3,$4,$5,$6::date,'draft' WHERE NOT EXISTS(SELECT 1 FROM import_confirmations WHERE user_id=$2::uuid AND (confirmation_key=$7::uuid OR import_id=$8::uuid)) AND EXISTS(SELECT 1 FROM ai_usage WHERE id=$8::uuid AND user_id=$2::uuid AND status='succeeded')`,
        [
          id,
          userId,
          value.program.name,
          value.program.description ?? null,
          value.program.durationWeeks ?? null,
          value.program.startsOn ?? null,
          value.confirmationKey,
          value.importId,
        ],
      ),
    ];
    const customIds = new Map<string, string>();
    for (const [position, day] of value.days.entries()) {
      const dayId = randomUUID();
      commands.push(
        q(
          'INSERT INTO program_days(id,program_id,name,day_of_week,position,notes) SELECT $1::uuid,$2::uuid,$3,$4,$5,$6 WHERE EXISTS(SELECT 1 FROM programs WHERE id=$2::uuid AND user_id=$7::uuid)',
          [
            dayId,
            id,
            day.name,
            day.dayOfWeek ?? null,
            position,
            day.notes ?? null,
            userId,
          ],
        ),
      );
      for (const [itemPosition, item] of day.exercises.entries()) {
        let exerciseId = item.exerciseId,
          tracking: 'reps' | 'duration';
        if (item.custom) {
          tracking = item.custom.trackingMode;
          const key = JSON.stringify(item.custom);
          exerciseId = customIds.get(key) ?? randomUUID();
          if (!customIds.has(key)) {
            customIds.set(key, exerciseId);
            commands.push(
              q(
                'INSERT INTO exercises(id,created_by_user_id,canonical_name,is_custom,tracking_mode,default_load_mode) SELECT $1::uuid,$2::uuid,$3,true,$4::tracking_mode,$5::load_mode WHERE EXISTS(SELECT 1 FROM programs WHERE id=$6::uuid AND user_id=$2::uuid)',
                [
                  exerciseId,
                  userId,
                  item.custom.name,
                  item.custom.trackingMode,
                  item.custom.defaultLoadMode ?? null,
                  id,
                ],
              ),
            );
          }
        } else tracking = trackingById.get(exerciseId!)!;
        const p = prescriptionPayload(
          prescriptionFor(tracking).parse({
            ...item.prescription,
            exerciseId,
          }) as Prescription,
        );
        commands.push(
          q(
            `INSERT INTO program_exercises(id,program_day_id,exercise_id,position,load_mode,target_sets,target_reps,target_rep_min,target_rep_max,target_duration_seconds,target_load_kg,target_assistance_kg,target_rpe,rest_seconds,notes) SELECT $1::uuid,$2::uuid,$3::uuid,$4,$5::load_mode,$6,$7,$8,$9,$10,$11::numeric,$12::numeric,$13::numeric,$14,$15 WHERE EXISTS(SELECT 1 FROM programs WHERE id=$16::uuid AND user_id=$17::uuid) AND EXISTS(SELECT 1 FROM exercises WHERE id=$3::uuid AND (NOT is_custom OR created_by_user_id=$17::uuid))`,
            [
              randomUUID(),
              dayId,
              exerciseId,
              itemPosition,
              p.loadMode,
              p.targetSets,
              p.targetReps ?? null,
              p.targetRepMin ?? null,
              p.targetRepMax ?? null,
              p.targetDurationSeconds ?? null,
              p.targetLoadKg ?? null,
              p.targetAssistanceKg ?? null,
              p.targetRpe ?? null,
              p.restSeconds ?? null,
              p.notes ?? null,
              id,
              userId,
            ],
          ),
        );
        // A concurrent exercise deletion must roll back, never silently omit a row.
        commands.push(
          q(
            `DO $$ BEGIN IF EXISTS(SELECT 1 FROM programs WHERE id='${id}'::uuid) AND NOT EXISTS(SELECT 1 FROM program_exercises WHERE program_day_id='${dayId}'::uuid AND position=${itemPosition}) THEN RAISE EXCEPTION 'Import write conflict'; END IF; END $$`,
          ),
        );
      }
    }
    commands.push(
      q(
        'INSERT INTO import_confirmations(user_id,confirmation_key,import_id,program_id,payload_hash) SELECT $1::uuid,$2::uuid,$3::uuid,$4::uuid,$5 WHERE EXISTS(SELECT 1 FROM programs WHERE id=$4::uuid AND user_id=$1::uuid)',
        [userId, value.confirmationKey, value.importId, id, hash],
      ),
    );
    commands.push(
      q(
        'SELECT program_id,payload_hash FROM import_confirmations WHERE user_id=$1::uuid AND (confirmation_key=$2::uuid OR import_id=$3::uuid)',
        [userId, value.confirmationKey, value.importId],
      ),
    );
    const result = await this.client.sqlClient.transaction(commands),
      row = result.at(-1)?.[0];
    if (!row)
      throw new ApiError(
        409,
        'IMPORT_CONFLICT',
        'Import confirmation conflict',
      );
    return this.replay(userId, row, hash, locale);
  }
  private replay(
    userId: string,
    row: Record<string, unknown>,
    hash: string,
    locale: string,
  ) {
    if (row.payload_hash !== hash)
      throw new ApiError(
        409,
        'IMPORT_CONFLICT',
        'Confirmation already used with different review',
      );
    if (!row.program_id)
      throw new ApiError(
        410,
        'IMPORT_ALREADY_REMOVED',
        'Imported program was removed',
      );
    return new ProgramService(this.client).detail(
      userId,
      String(row.program_id),
      locale,
    );
  }
}
