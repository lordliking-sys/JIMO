import {
  and,
  or,
  eq,
  gt,
  desc,
  ilike,
  sql,
  getTableColumns,
} from 'drizzle-orm';
import {
  programs,
  programDays,
  programExercises,
  exercises,
  exerciseTranslations,
  type DatabaseClient,
} from '@jimo/database';
import {
  prescriptionFor,
  type ProgramInput,
  type DayInput,
  type Prescription,
  type ExerciseDto,
  type ProgramSummary,
  type ProgramDetail,
  type ProgramExerciseDto,
  customExerciseInputSchema,
  exerciseQuerySchema,
} from '@jimo/schemas';
import type { z } from 'zod';
import { ApiError } from './errors';
const notFound = (code: string): never => {
  throw new ApiError(404, code, 'Resource not found');
};
const conflict = (): never => {
  throw new ApiError(
    409,
    'CONFLICT',
    'Resource has changed; reload and try again',
  );
};
type Patch<T> = { [K in keyof T]?: T[K] | undefined };
const stamp = (r: { createdAt: Date; updatedAt: Date }) => ({
  createdAt: r.createdAt.toISOString(),
  updatedAt: r.updatedAt.toISOString(),
});
export function prescriptionPayload(r: Prescription): Prescription {
  return {
    exerciseId: r.exerciseId,
    loadMode: r.loadMode,
    targetSets: r.targetSets,
    targetReps: r.targetReps ?? null,
    targetRepMin: r.targetRepMin ?? null,
    targetRepMax: r.targetRepMax ?? null,
    targetDurationSeconds: r.targetDurationSeconds ?? null,
    targetLoadKg: r.targetLoadKg ?? null,
    targetAssistanceKg: r.targetAssistanceKg ?? null,
    targetRpe: r.targetRpe ?? null,
    restSeconds: r.restSeconds ?? null,
    notes: r.notes ?? null,
  };
}
export class ProgramService {
  private db;
  constructor(private client: DatabaseClient) {
    this.db = client.db;
  }
  private visibleExercise(userId: string) {
    return or(
      eq(exercises.isCustom, false),
      eq(exercises.createdByUserId, userId),
    );
  }
  private exerciseFields() {
    return {
      id: exercises.id,
      displayName: sql<string>`CASE WHEN ${exercises.isCustom} THEN ${exercises.canonicalName} ELSE coalesce(${exerciseTranslations.name}, ${exercises.canonicalName}) END`,
      canonicalName: exercises.canonicalName,
      trackingMode: exercises.trackingMode,
      defaultLoadMode: exercises.defaultLoadMode,
      isCustom: exercises.isCustom,
    };
  }
  private summary(
    r: typeof programs.$inferSelect,
    daysCount: number,
  ): ProgramSummary {
    return {
      id: r.id,
      name: r.name,
      description: r.description,
      status: r.status,
      durationWeeks: r.durationWeeks,
      startsOn: r.startsOn,
      daysCount,
      ...stamp(r),
    };
  }
  async listExercises(
    userId: string,
    locale: string,
    input: z.infer<typeof exerciseQuerySchema>,
  ) {
    const term = `%${(input.search ?? '').replace(/[\\%_]/g, '\\$&')}%`;
    const rows = await this.db
      .select(this.exerciseFields())
      .from(exercises)
      .leftJoin(
        exerciseTranslations,
        and(
          eq(exerciseTranslations.exerciseId, exercises.id),
          eq(exerciseTranslations.locale, locale),
        ),
      )
      .where(
        and(
          this.visibleExercise(userId),
          input.trackingMode
            ? eq(exercises.trackingMode, input.trackingMode)
            : undefined,
          input.cursor ? gt(exercises.id, input.cursor) : undefined,
          input.search
            ? or(
                ilike(exercises.canonicalName, term),
                ilike(exerciseTranslations.name, term),
              )
            : undefined,
        ),
      )
      .orderBy(exercises.id)
      .limit(input.limit + 1);
    const visible = rows.slice(0, input.limit);
    return {
      exercises: visible,
      nextCursor:
        rows.length > input.limit ? (visible.at(-1)?.id ?? null) : null,
    };
  }
  async getExercise(
    userId: string,
    id: string,
    locale: string,
  ): Promise<ExerciseDto> {
    const [row] = await this.db
      .select(this.exerciseFields())
      .from(exercises)
      .leftJoin(
        exerciseTranslations,
        and(
          eq(exerciseTranslations.exerciseId, exercises.id),
          eq(exerciseTranslations.locale, locale),
        ),
      )
      .where(and(eq(exercises.id, id), this.visibleExercise(userId)));
    if (!row) return notFound('EXERCISE_NOT_FOUND');
    return row;
  }
  async createExercise(
    userId: string,
    input: z.infer<typeof customExerciseInputSchema>,
  ): Promise<ExerciseDto> {
    const [r] = await this.db
      .insert(exercises)
      .values({
        canonicalName: input.name,
        createdByUserId: userId,
        isCustom: true,
        trackingMode: input.trackingMode,
        defaultLoadMode: input.defaultLoadMode ?? null,
      })
      .returning();
    if (!r) throw new Error('Exercise insert failed');
    return {
      id: r.id,
      displayName: r.canonicalName,
      canonicalName: r.canonicalName,
      trackingMode: r.trackingMode,
      defaultLoadMode: r.defaultLoadMode,
      isCustom: r.isCustom,
    };
  }
  async list(userId: string) {
    const rows = await this.db
      .select({
        ...getTableColumns(programs),
        daysCount: sql<number>`(SELECT count(*)::int FROM program_days d WHERE d.program_id = ${programs.id})`,
      })
      .from(programs)
      .where(eq(programs.userId, userId))
      .orderBy(
        sql`CASE ${programs.status} WHEN 'active' THEN 0 WHEN 'draft' THEN 1 ELSE 2 END`,
        desc(programs.updatedAt),
        programs.id,
      );
    return { programs: rows.map((r) => this.summary(r, r.daysCount)) };
  }
  async detail(
    userId: string,
    id: string,
    locale: string,
  ): Promise<ProgramDetail> {
    const [program] = await this.db
      .select()
      .from(programs)
      .where(and(eq(programs.id, id), eq(programs.userId, userId)));
    if (!program) return notFound('PROGRAM_NOT_FOUND');
    const days = await this.db
      .select()
      .from(programDays)
      .where(eq(programDays.programId, id))
      .orderBy(programDays.position);
    const rows = await this.db
      .select({
        ...getTableColumns(programExercises),
        exercise: this.exerciseFields(),
      })
      .from(programExercises)
      .innerJoin(programDays, eq(programDays.id, programExercises.programDayId))
      .innerJoin(exercises, eq(exercises.id, programExercises.exerciseId))
      .leftJoin(
        exerciseTranslations,
        and(
          eq(exerciseTranslations.exerciseId, exercises.id),
          eq(exerciseTranslations.locale, locale),
        ),
      )
      .where(and(eq(programDays.programId, id), this.visibleExercise(userId)))
      .orderBy(programExercises.position);
    const item = (r: (typeof rows)[number]): ProgramExerciseDto => ({
      ...prescriptionPayload(r),
      id: r.id,
      position: r.position,
      exercise: r.exercise,
      ...stamp(r),
    });
    return {
      ...this.summary(program, days.length),
      days: days.map((r) => ({
        id: r.id,
        name: r.name,
        dayOfWeek: r.dayOfWeek,
        position: r.position,
        notes: r.notes,
        exercises: rows.filter((e) => e.programDayId === r.id).map(item),
        ...stamp(r),
      })),
    };
  }
  async create(userId: string, input: ProgramInput, locale: string) {
    const [r] = await this.db
      .insert(programs)
      .values({ ...input, userId })
      .returning({ id: programs.id });
    if (!r) throw new Error('Program insert failed');
    return this.detail(userId, r.id, locale);
  }
  async update(
    userId: string,
    id: string,
    input: Patch<ProgramInput>,
    locale: string,
  ) {
    const rows = await this.db
      .update(programs)
      .set(input)
      .where(and(eq(programs.id, id), eq(programs.userId, userId)))
      .returning({ id: programs.id });
    if (!rows.length) return notFound('PROGRAM_NOT_FOUND');
    return this.detail(userId, id, locale);
  }
  async activate(userId: string, id: string, locale: string) {
    const result = await this.db.batch([
      this.db.execute(
        sql`SELECT pg_advisory_xact_lock(hashtextextended(${userId}::text, 0))`,
      ),
      this.db
        .update(programs)
        .set({ status: 'archived' })
        .where(
          and(
            eq(programs.userId, userId),
            eq(programs.status, 'active'),
            sql`EXISTS (SELECT 1 FROM programs target WHERE target.id = ${id}::uuid AND target.user_id = ${userId}::uuid)`,
          ),
        )
        .returning({ id: programs.id }),
      this.db
        .update(programs)
        .set({ status: 'active' })
        .where(and(eq(programs.id, id), eq(programs.userId, userId)))
        .returning({ id: programs.id }),
    ]);
    if (!result[2].length) return notFound('PROGRAM_NOT_FOUND');
    return this.detail(userId, id, locale);
  }
  async archive(userId: string, id: string, locale: string) {
    const result = await this.db.batch([
      this.db.execute(
        sql`SELECT pg_advisory_xact_lock(hashtextextended(${userId}::text, 0))`,
      ),
      this.db
        .update(programs)
        .set({ status: 'archived' })
        .where(and(eq(programs.id, id), eq(programs.userId, userId)))
        .returning({ id: programs.id }),
    ]);
    if (!result[1].length) return notFound('PROGRAM_NOT_FOUND');
    return this.detail(userId, id, locale);
  }
  private lockProgram(userId: string, id: string) {
    return this.db
      .select({ id: programs.id })
      .from(programs)
      .where(and(eq(programs.id, id), eq(programs.userId, userId)))
      .for('update');
  }
  async addDay(userId: string, id: string, input: DayInput, locale: string) {
    const result = await this.db.batch([
      this.lockProgram(userId, id),
      this.db.execute(
        sql`INSERT INTO program_days (program_id, name, day_of_week, position, notes) SELECT ${id}::uuid, ${input.name}, ${input.dayOfWeek ?? null}::integer, coalesce(max(d.position),-1)+1, ${input.notes ?? null} FROM program_days d WHERE d.program_id = ${id}::uuid HAVING EXISTS (SELECT 1 FROM programs WHERE id = ${id}::uuid AND user_id = ${userId}::uuid) AND count(*) < 1000 RETURNING id`,
      ),
    ]);
    if (!result[0].length) return notFound('PROGRAM_NOT_FOUND');
    if (!result[1].rows.length) return conflict();
    return this.detail(userId, id, locale);
  }
  private async day(userId: string, id: string) {
    const [r] = await this.db
      .select({ ...getTableColumns(programDays) })
      .from(programDays)
      .innerJoin(programs, eq(programs.id, programDays.programId))
      .where(and(eq(programDays.id, id), eq(programs.userId, userId)));
    if (!r) return notFound('PROGRAM_DAY_NOT_FOUND');
    return r;
  }
  async updateDay(
    userId: string,
    id: string,
    input: Patch<DayInput>,
    locale: string,
  ) {
    const day = await this.day(userId, id);
    const result = await this.db
      .update(programDays)
      .set(input)
      .where(
        and(
          eq(programDays.id, id),
          sql`EXISTS (SELECT 1 FROM programs p WHERE p.id = ${programDays.programId} AND p.user_id = ${userId}::uuid)`,
        ),
      )
      .returning({ id: programDays.id });
    if (!result.length) return notFound('PROGRAM_DAY_NOT_FOUND');
    return this.detail(userId, day.programId, locale);
  }
  async removeDay(userId: string, id: string, locale: string) {
    const day = await this.day(userId, id),
      parent = day.programId;
    const result = await this.db.batch([
      this.lockProgram(userId, parent),
      this.db
        .delete(programDays)
        .where(
          and(
            eq(programDays.id, id),
            sql`EXISTS (SELECT 1 FROM programs p WHERE p.id = ${programDays.programId} AND p.user_id = ${userId}::uuid)`,
          ),
        )
        .returning({ id: programDays.id }),
      this.db.execute(
        sql`UPDATE program_days SET position = position + 1000000 WHERE program_id = ${parent}::uuid AND EXISTS (SELECT 1 FROM programs WHERE id = ${parent}::uuid AND user_id = ${userId}::uuid)`,
      ),
      this.db.execute(
        sql`WITH ranks AS (SELECT id, row_number() OVER (ORDER BY position)-1 AS pos FROM program_days WHERE program_id = ${parent}::uuid) UPDATE program_days d SET position = ranks.pos FROM ranks WHERE d.id = ranks.id AND EXISTS (SELECT 1 FROM programs WHERE id = ${parent}::uuid AND user_id = ${userId}::uuid)`,
      ),
    ]);
    if (!result[1].length) return notFound('PROGRAM_DAY_NOT_FOUND');
    return this.detail(userId, parent, locale);
  }
  async reorderDays(
    userId: string,
    parent: string,
    ids: string[],
    locale: string,
  ) {
    const list = sql`${sql.param(ids)}::uuid[]`;
    const valid = sql`(SELECT count(*) FROM program_days WHERE program_id = ${parent}::uuid) = cardinality(${list}) AND (SELECT count(*) FROM program_days WHERE program_id = ${parent}::uuid AND id = ANY(${list})) = cardinality(${list})`;
    const result = await this.db.batch([
      this.lockProgram(userId, parent),
      this.db.execute(sql`SELECT ${valid} AS valid`),
      this.db.execute(
        sql`UPDATE program_days SET position = position + 1000000 WHERE program_id = ${parent}::uuid AND ${valid} AND EXISTS (SELECT 1 FROM programs WHERE id = ${parent}::uuid AND user_id = ${userId}::uuid) RETURNING id`,
      ),
      this.db.execute(
        sql`UPDATE program_days SET position = array_position(${list},id)-1 WHERE program_id = ${parent}::uuid AND ${valid} AND EXISTS (SELECT 1 FROM programs WHERE id = ${parent}::uuid AND user_id = ${userId}::uuid)`,
      ),
    ]);
    if (!result[0].length) return notFound('PROGRAM_NOT_FOUND');
    if (
      result[1].rows[0]?.valid !== true ||
      result[2].rows.length !== ids.length
    )
      return conflict();
    return this.detail(userId, parent, locale);
  }
  private async availableExercise(userId: string, id: string) {
    const [r] = await this.db
      .select()
      .from(exercises)
      .where(and(eq(exercises.id, id), this.visibleExercise(userId)));
    if (!r) return notFound('EXERCISE_NOT_FOUND');
    return r;
  }
  async addPrescription(
    userId: string,
    dayId: string,
    input: Prescription,
    locale: string,
  ) {
    const day = await this.day(userId, dayId);
    const exercise = await this.availableExercise(userId, input.exerciseId);
    const p = prescriptionPayload(
      prescriptionFor(exercise.trackingMode).parse(input),
    );
    const result = await this.db.batch([
      this.lockProgram(userId, day.programId),
      this.db.execute(
        sql`INSERT INTO program_exercises (program_day_id, exercise_id, position, load_mode, target_sets, target_reps, target_rep_min, target_rep_max, target_duration_seconds, target_load_kg, target_assistance_kg, target_rpe, rest_seconds, notes) SELECT ${dayId}::uuid, ${p.exerciseId}::uuid, coalesce(max(e.position),-1)+1, ${p.loadMode}::load_mode, ${p.targetSets}::integer, ${p.targetReps ?? null}::integer, ${p.targetRepMin ?? null}::integer, ${p.targetRepMax ?? null}::integer, ${p.targetDurationSeconds ?? null}::integer, ${p.targetLoadKg ?? null}::numeric, ${p.targetAssistanceKg ?? null}::numeric, ${p.targetRpe ?? null}::numeric, ${p.restSeconds ?? null}::integer, ${p.notes ?? null} FROM program_exercises e WHERE e.program_day_id = ${dayId}::uuid HAVING count(*) < 1000 AND EXISTS (SELECT 1 FROM program_days d JOIN programs p ON p.id=d.program_id WHERE d.id=${dayId}::uuid AND p.user_id=${userId}::uuid) AND EXISTS (SELECT 1 FROM exercises x WHERE x.id=${p.exerciseId}::uuid AND (NOT x.is_custom OR x.created_by_user_id=${userId}::uuid)) RETURNING id`,
      ),
    ]);
    if (!result[1].rows.length) return conflict();
    return this.detail(userId, day.programId, locale);
  }
  private async prescription(userId: string, id: string) {
    const [r] = await this.db
      .select({
        ...getTableColumns(programExercises),
        programId: programDays.programId,
        revision: sql<string>`${programExercises}.xmin::text`,
      })
      .from(programExercises)
      .innerJoin(programDays, eq(programDays.id, programExercises.programDayId))
      .innerJoin(programs, eq(programs.id, programDays.programId))
      .where(and(eq(programExercises.id, id), eq(programs.userId, userId)));
    if (!r) return notFound('PROGRAM_EXERCISE_NOT_FOUND');
    return r;
  }
  async updatePrescription(
    userId: string,
    id: string,
    input: Patch<Prescription>,
    locale: string,
  ) {
    const current = await this.prescription(userId, id);
    const merged = prescriptionPayload({
      ...prescriptionPayload(current),
      ...input,
      exerciseId: input.exerciseId ?? current.exerciseId,
      loadMode: input.loadMode ?? current.loadMode,
      targetSets: input.targetSets ?? current.targetSets,
    });
    const exercise = await this.availableExercise(userId, merged.exerciseId);
    const valid = prescriptionFor(exercise.trackingMode).parse(merged);
    const result = await this.db.batch([
      this.lockProgram(userId, current.programId),
      this.db
        .update(programExercises)
        .set(valid)
        .where(
          and(
            eq(programExercises.id, id),
            sql`${programExercises}.xmin::text = ${current.revision}`,
            sql`EXISTS (SELECT 1 FROM program_days d JOIN programs p ON p.id=d.program_id WHERE d.id=${programExercises.programDayId} AND p.user_id=${userId}::uuid)`,
          ),
        )
        .returning({ id: programExercises.id }),
    ]);
    if (!result[1].length) return conflict();
    return this.detail(userId, current.programId, locale);
  }
  async removePrescription(userId: string, id: string, locale: string) {
    const current = await this.prescription(userId, id),
      dayId = current.programDayId;
    const owned = sql`EXISTS (SELECT 1 FROM program_days d JOIN programs p ON p.id=d.program_id WHERE d.id=${dayId}::uuid AND p.user_id=${userId}::uuid)`;
    const result = await this.db.batch([
      this.lockProgram(userId, current.programId),
      this.db
        .delete(programExercises)
        .where(and(eq(programExercises.id, id), owned))
        .returning({ id: programExercises.id }),
      this.db.execute(
        sql`UPDATE program_exercises SET position = position + 1000000 WHERE program_day_id=${dayId}::uuid AND ${owned}`,
      ),
      this.db.execute(
        sql`WITH ranks AS (SELECT id, row_number() OVER (ORDER BY position)-1 AS pos FROM program_exercises WHERE program_day_id=${dayId}::uuid) UPDATE program_exercises e SET position=ranks.pos FROM ranks WHERE e.id=ranks.id AND ${owned}`,
      ),
    ]);
    if (!result[1].length) return notFound('PROGRAM_EXERCISE_NOT_FOUND');
    return this.detail(userId, current.programId, locale);
  }
  async reorderPrescriptions(
    userId: string,
    dayId: string,
    ids: string[],
    locale: string,
  ) {
    const day = await this.day(userId, dayId),
      list = sql`${sql.param(ids)}::uuid[]`;
    const owned = sql`EXISTS (SELECT 1 FROM program_days d JOIN programs p ON p.id=d.program_id WHERE d.id=${dayId}::uuid AND p.user_id=${userId}::uuid)`;
    const valid = sql`(SELECT count(*) FROM program_exercises WHERE program_day_id=${dayId}::uuid) = cardinality(${list}) AND (SELECT count(*) FROM program_exercises WHERE program_day_id=${dayId}::uuid AND id=ANY(${list})) = cardinality(${list})`;
    const result = await this.db.batch([
      this.lockProgram(userId, day.programId),
      this.db.execute(sql`SELECT (${valid}) AND (${owned}) AS valid`),
      this.db.execute(
        sql`UPDATE program_exercises SET position=position+1000000 WHERE program_day_id=${dayId}::uuid AND ${owned} AND ${valid} RETURNING id`,
      ),
      this.db.execute(
        sql`UPDATE program_exercises SET position=array_position(${list},id)-1 WHERE program_day_id=${dayId}::uuid AND ${owned} AND ${valid}`,
      ),
    ]);
    if (
      result[1].rows[0]?.valid !== true ||
      result[2].rows.length !== ids.length
    )
      return conflict();
    return this.detail(userId, day.programId, locale);
  }
}
