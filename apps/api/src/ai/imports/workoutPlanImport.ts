import {
  extractedWorkoutPlanSchema,
  importReviewSchema,
  importLimits,
  type ImportReview,
} from '@jimo/schemas';
import type { DatabaseClient } from '@jimo/database';
import type { WorkoutPlanExtractor, ExtractionResult } from '../client';
import { AiUsageService } from '../usage';
import { ApiError } from '../../errors';
import { matchExercise, type CatalogExercise } from './matching';
import type { ImportFile } from './files';
export class WorkoutPlanImportService {
  readonly usage: AiUsageService;
  constructor(
    private client: DatabaseClient,
    private extractor: WorkoutPlanExtractor | undefined,
    readonly model: string,
    limits?: { daily: number; hourly: number },
  ) {
    this.usage = new AiUsageService(client, limits?.daily, limits?.hourly);
  }
  async extract(
    userId: string,
    files: ImportFile[],
    locale: 'it' | 'en',
  ): Promise<ImportReview> {
    if (!this.extractor)
      throw new ApiError(
        503,
        'AI_NOT_CONFIGURED',
        'Import service unavailable',
      );
    const importId = await this.usage.canUseAiFeature(
      userId,
      'workout_plan_import',
      this.model,
    );
    const controller = new AbortController(),
      timer = setTimeout(() => controller.abort(), 120_000);
    let result: ExtractionResult | undefined;
    try {
      result = await Promise.race([
        this.extractor.extract(files, locale, controller.signal),
        new Promise<never>((_, reject) =>
          controller.signal.addEventListener(
            'abort',
            () => reject(new ApiError(504, 'AI_TIMEOUT', 'Import timed out')),
            { once: true },
          ),
        ),
      ]);
      let output: unknown = result.output;
      if (typeof output === 'string') {
        try {
          output = JSON.parse(output);
        } catch {
          throw new ApiError(422, 'AI_INVALID_OUTPUT', 'Import output invalid');
        }
      }
      const parsed = extractedWorkoutPlanSchema.safeParse(output);
      if (
        !parsed.success ||
        parsed.data.days.reduce((n, d) => n + d.exercises.length, 0) >
          importLimits.maxExercises
      )
        throw new ApiError(422, 'AI_INVALID_OUTPUT', 'Import output invalid');
      const plan = parsed.data;
      if (!plan.days.some((d) => d.exercises.length))
        throw new ApiError(
          422,
          'IMPORT_NO_PROGRAM',
          'No workout plan recognized',
        );
      for (const day of plan.days)
        for (const e of day.exercises)
          if (e.sourceLoadUnit === 'lb') {
            e.loadKg = null;
            e.assistanceKg = null;
            plan.warnings.push(
              locale === 'it'
                ? 'Carico in lb: verifica e inserisci esplicitamente il valore in kg.'
                : 'Load in lb: verify and enter kg explicitly.',
            );
          }
      for (const day of plan.days)
        for (const e of day.exercises)
          if (
            /\bRIR\b/i.test(e.rawPrescription ?? '') &&
            !/\bRPE\b/i.test(e.rawPrescription ?? '')
          ) {
            e.rpe = null;
            plan.warnings.push(
              locale === 'it'
                ? 'RIR mantenuto nelle note: non viene convertito in RPE.'
                : 'RIR retained in notes: it is not converted to RPE.',
            );
          }
      plan.warnings = [...new Set(plan.warnings)].slice(0, 100);
      const rows = await this.client.sqlClient.query(
        `SELECT e.id,e.canonical_name,e.tracking_mode,e.default_load_mode,e.is_custom,coalesce(json_agg(json_build_object('locale',t.locale,'name',t.name)) FILTER(WHERE t.name IS NOT NULL),'[]') AS translations FROM exercises e LEFT JOIN exercise_translations t ON t.exercise_id=e.id WHERE NOT e.is_custom OR e.created_by_user_id=$1::uuid GROUP BY e.id ORDER BY e.id`,
        [userId],
      );
      const catalog: CatalogExercise[] = rows.map((r) => {
        const names = r.translations as { locale: string; name: string }[];
        return {
          id: String(r.id),
          canonicalName: String(r.canonical_name),
          displayName:
            names.find((t) => t.locale === locale)?.name ??
            String(r.canonical_name),
          trackingMode: r.tracking_mode as 'reps' | 'duration',
          defaultLoadMode:
            r.default_load_mode as CatalogExercise['defaultLoadMode'],
          isCustom: Boolean(r.is_custom),
          names: names
            .filter((t) => ['it', 'en'].includes(t.locale))
            .map((t) => t.name),
        };
      });
      const response = importReviewSchema.parse({
        importId,
        extraction: plan,
        matches: plan.days.map((d) =>
          d.exercises.map((e) => matchExercise(e, catalog)),
        ),
      });
      await this.usage.finish(
        importId,
        'succeeded',
        result.inputTokens,
        result.outputTokens,
      );
      return response;
    } catch (error) {
      const code =
        error instanceof ApiError
          ? error.code
          : controller.signal.aborted
            ? 'AI_TIMEOUT'
            : error &&
                typeof error === 'object' &&
                'status' in error &&
                error.status === 429
              ? 'AI_RATE_LIMITED'
              : 'AI_TEMPORARILY_UNAVAILABLE';
      await this.usage.finish(
        importId,
        code === 'AI_INVALID_OUTPUT'
          ? 'invalid_output'
          : code === 'IMPORT_NO_PROGRAM'
            ? 'no_program'
            : code === 'AI_TIMEOUT'
              ? 'timeout'
              : 'failed',
        result?.inputTokens,
        result?.outputTokens,
      );
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        code === 'AI_RATE_LIMITED' ? 429 : code === 'AI_TIMEOUT' ? 504 : 503,
        code,
        'Import could not be completed',
      );
    } finally {
      clearTimeout(timer);
    }
  }
}
