import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { eq } from 'drizzle-orm';
import OpenAI from 'openai';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { EnvHttpProxyAgent, fetch as httpFetch } from 'undici';
import { createDatabase, assertDevelopment, users } from '@jimo/database';
import {
  extractedWorkoutPlanSchema,
  type ExtractedWorkoutPlan,
} from '@jimo/schemas';
import { OpenAIWorkoutPlanExtractor } from '../src/ai/client';
import { WorkoutPlanImportService } from '../src/ai/imports/workoutPlanImport';
import { validateImportFile } from '../src/ai/imports/files';
import { readEnv } from '../src/env';
import { ApiError } from '../src/errors';

class SmokeCheckError extends Error {}
function check(value: unknown, code: string): asserts value {
  if (!value) throw new SmokeCheckError(code);
}
async function fixture(missing: boolean) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const page = pdf.addPage([595, 842]);
  const lines = missing
    ? ['PUSH', 'Panca piana', '3 x 10', 'Carico: ??? kg', 'RPE: ???']
    : [
        'PUSH',
        'Panca piana',
        '4 x 8',
        '80 kg',
        'RPE 8',
        'Recupero 3 min',
        'Dip',
        '3 x 8-12',
        '+10 kg',
        'Recupero 2 min',
        'PULL',
        'Trazioni',
        '4 x 8',
        '+20 kg',
        'RPE 8',
        'Recupero 3 min',
      ];
  lines.forEach((text, index) =>
    page.drawText(text, { x: 40, y: 790 - index * 40, size: 17, font }),
  );
  return validateImportFile(
    'application/pdf',
    'synthetic.pdf',
    Buffer.from(await pdf.save()),
  );
}
function validateSimple(plan: ExtractedWorkoutPlan) {
  check(plan.days.length === 2, 'SIMPLE_DAY_COUNT');
  const [push, pull] = plan.days;
  check(/^push$/i.test(push!.name ?? ''), 'SIMPLE_PUSH_NAME');
  check(/^pull$/i.test(pull!.name ?? ''), 'SIMPLE_PULL_NAME');
  check(push!.exercises.length === 2, 'SIMPLE_PUSH_EXERCISES');
  check(pull!.exercises.length === 1, 'SIMPLE_PULL_EXERCISES');
  const [bench, dip] = push!.exercises;
  const [pullUp] = pull!.exercises;
  const expected = [
    {
      item: bench!,
      name: /panca|bench/i,
      sets: 4,
      reps: 8,
      kg: 80,
      mode: 'external',
      rpe: 8,
      rest: 180,
    },
    {
      item: dip!,
      name: /dip/i,
      sets: 3,
      reps: null,
      kg: 10,
      mode: 'weighted',
      rpe: null,
      rest: 120,
    },
    {
      item: pullUp!,
      name: /trazion|pull[ -]?up/i,
      sets: 4,
      reps: 8,
      kg: 20,
      mode: 'weighted',
      rpe: 8,
      rest: 180,
    },
  ];
  for (const [index, e] of expected.entries()) {
    const code = `SIMPLE_EXERCISE_${index + 1}`;
    check(e.name.test(e.item.rawName ?? ''), code + '_NAME');
    check(e.item.sets === e.sets, code + '_SETS');
    check(e.item.reps === e.reps, code + '_REPS');
    check(e.item.loadMode === e.mode, code + '_LOAD_MODE');
    check(
      e.item.loadKg !== null && Number(e.item.loadKg) === e.kg,
      code + '_KG',
    );
    check(
      e.rpe === null
        ? e.item.rpe === null
        : e.item.rpe !== null && Number(e.item.rpe) === e.rpe,
      code + '_RPE',
    );
    check(e.item.restSeconds === e.rest, code + '_REST');
    check(
      e.item.assistanceKg === null && e.item.durationSeconds === null,
      code + '_NO_EXTRA_VALUES',
    );
  }
  check(dip!.repMin === 8 && dip!.repMax === 12, 'SIMPLE_DIP_RANGE');
  check(
    bench!.repMin === null &&
      bench!.repMax === null &&
      pullUp!.repMin === null &&
      pullUp!.repMax === null,
    'SIMPLE_FIXED_REPS',
  );
}
function validateMissing(plan: ExtractedWorkoutPlan) {
  check(
    plan.days.length === 1 && plan.days[0]!.exercises.length === 1,
    'MISSING_STRUCTURE',
  );
  const e = plan.days[0]!.exercises[0]!;
  check(/panca|bench/i.test(e.rawName ?? ''), 'MISSING_NAME');
  check(e.sets === 3 && e.reps === 10, 'MISSING_EXPLICIT_VALUES');
  check(e.loadKg === null && e.assistanceKg === null, 'MISSING_KG_NOT_NULL');
  check(e.rpe === null, 'MISSING_RPE_NOT_NULL');
  check(e.restSeconds === null, 'MISSING_REST_NOT_NULL');
  return {
    missingKgNull: true,
    missingRpeNull: true,
    missingRestNull: true,
    warningOrLowConfidence: plan.warnings.length > 0 || e.confidence < 0.8,
  };
}
async function main() {
  if (process.env.AI_IMPORT_ENABLED !== 'true') {
    console.log(
      'Real OpenAI smoke disabled: AI_IMPORT_ENABLED is not true; no provider call',
    );
    return;
  }
  if (!process.env.OPENAI_API_KEY) {
    console.log(
      'Real OpenAI smoke pending: backend key absent; no provider call',
    );
    return;
  }
  const env = readEnv();
  check(env.NODE_ENV !== 'production', 'PRODUCTION_ENVIRONMENT_FORBIDDEN');
  check(
    process.argv.slice(2).every((arg) => arg === '--missing-only'),
    'UNKNOWN_SMOKE_ARGUMENT',
  );
  const database = createDatabase(env.DATABASE_URL);
  const userId = randomUUID();
  let verified = false;
  let extractor: OpenAIWorkoutPlanExtractor | undefined;
  const caPath = '/etc/ssl/certs/ca-certificates.crt';
  const tls = existsSync(caPath) ? { ca: readFileSync(caPath) } : {};
  const dispatcher = new EnvHttpProxyAgent({ requestTls: tls, proxyTls: tls });
  let responseCalls = 0;
  const fetcher: typeof fetch = async (input, init) => {
    if (new URL(String(input)).pathname === '/v1/responses') responseCalls++;
    return httpFetch(
      input as string,
      { ...init, dispatcher } as Parameters<typeof httpFetch>[1],
    ) as unknown as ReturnType<typeof fetch>;
  };
  try {
    await assertDevelopment(database, env.NEON_DEVELOPMENT_BRANCH_ID);
    verified = true;
    const sdk = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
      maxRetries: 0,
      timeout: 30_000,
      logLevel: 'off',
      fetch: fetcher,
    });
    const model = await sdk.models.retrieve(env.OPENAI_IMPORT_MODEL);
    check(model.id === env.OPENAI_IMPORT_MODEL, 'MODEL_ID_MISMATCH');
    console.log('Configuration', {
      backendKeyPresent: true,
      responsesInitialized: typeof sdk.responses.create === 'function',
      modelAvailable: true,
      model: model.id,
      developmentGuard: 'PASS',
    });
    await database.db
      .insert(users)
      .values({ id: userId, displayName: 'JIMO_OPENAI_SMOKE_SYNTHETIC' });
    extractor = new OpenAIWorkoutPlanExtractor(
      env.OPENAI_IMPORT_MODEL,
      env.OPENAI_API_KEY!,
      fetcher,
    );
    let providerPlan: ExtractedWorkoutPlan | undefined;
    let providerFailure:
      | { status: number | undefined; code: string; category: string }
      | undefined;
    const observedExtractor = {
      extract: async (
        ...args: Parameters<OpenAIWorkoutPlanExtractor['extract']>
      ) => {
        let result;
        try {
          result = await extractor!.extract(...args);
        } catch (error) {
          if (error instanceof OpenAI.APIError)
            providerFailure = {
              status: error.status,
              code:
                error.code &&
                [
                  'insufficient_quota',
                  'rate_limit_exceeded',
                  'model_not_found',
                  'invalid_api_key',
                  'invalid_json_schema',
                ].includes(error.code)
                  ? error.code
                  : 'provider_error',
              category: /insufficient.quota|billing|credits/i.test(
                error.message,
              )
                ? 'account_quota'
                : /rate.limit|tokens per min|requests per min/i.test(
                      error.message,
                    )
                  ? 'temporary_rate_limit'
                  : 'not_identified',
            };
          throw error;
        }
        let output: unknown = result.output;
        if (typeof output === 'string') {
          try {
            output = JSON.parse(output);
          } catch {
            throw new SmokeCheckError('PROVIDER_JSON_INVALID');
          }
        }
        const parsed = extractedWorkoutPlanSchema.safeParse(output);
        check(parsed.success, 'PROVIDER_ZOD_INVALID');
        providerPlan = parsed.data;
        return result;
      },
    };
    const service = new WorkoutPlanImportService(
      database,
      observedExtractor,
      env.OPENAI_IMPORT_MODEL,
    );
    const counts = async () => {
      const [row] = await database.sqlClient.query(
        `SELECT (SELECT count(*)::int FROM programs WHERE user_id=$1::uuid) AS programs,(SELECT count(*)::int FROM exercises WHERE created_by_user_id=$1::uuid) AS custom_exercises,(SELECT count(*)::int FROM import_confirmations WHERE user_id=$1::uuid) AS confirmations`,
        [userId],
      );
      return row!;
    };
    check(
      Object.values(await counts()).every((value) => value === 0),
      'INITIAL_STATE_NOT_EMPTY',
    );
    let inputTotal = 0;
    let outputTotal = 0;
    let accurate = true;
    const fixtures = process.argv.includes('--missing-only')
      ? [true]
      : [false, true];
    for (const missing of fixtures) {
      providerPlan = undefined;
      providerFailure = undefined;
      const file = await fixture(missing);
      try {
        const review = await service.extract(userId, [file], 'it');
        const effects = await counts();
        check(
          Object.values(effects).every((value) => value === 0),
          'EXTRACTION_CREATED_ENTITIES',
        );
        const [usage] = await database.sqlClient.query(
          'SELECT user_id,feature,model,status,input_tokens,output_tokens,estimated_cost FROM ai_usage WHERE id=$1::uuid',
          [review.importId],
        );
        check(
          usage?.user_id === userId &&
            usage.feature === 'workout_plan_import' &&
            usage.model === env.OPENAI_IMPORT_MODEL &&
            usage.status === 'succeeded',
          'USAGE_METADATA_INVALID',
        );
        check(
          Number.isInteger(usage.input_tokens) &&
            Number(usage.input_tokens) > 0 &&
            Number.isInteger(usage.output_tokens) &&
            Number(usage.output_tokens) > 0,
          'USAGE_TOKENS_MISSING',
        );
        inputTotal += Number(usage.input_tokens);
        outputTotal += Number(usage.output_tokens);
        let accuracy = 'PASS';
        let noInvention: ReturnType<typeof validateMissing> | undefined;
        try {
          check(providerPlan, 'PROVIDER_PLAN_ABSENT');
          if (missing) noInvention = validateMissing(providerPlan);
          else validateSimple(providerPlan);
        } catch (error) {
          if (!(error instanceof SmokeCheckError)) throw error;
          accuracy = error.message;
          accurate = false;
        }
        console.log(missing ? 'Missing-value fixture' : 'Simple fixture', {
          responsesApi: 'OK',
          zod: 'PASS',
          days: review.extraction.days.length,
          exercises: review.extraction.days.reduce(
            (n, d) => n + d.exercises.length,
            0,
          ),
          accuracy,
          ...noInvention,
          usage: {
            userVerified: true,
            feature: usage.feature,
            model: usage.model,
            status: usage.status,
            inputTokens: usage.input_tokens,
            outputTokens: usage.output_tokens,
            estimatedCost: usage.estimated_cost,
          },
          ...effects,
        });
      } catch (error) {
        if (!(error instanceof ApiError)) throw error;
        accurate = false;
        const effects = await counts();
        check(
          Object.values(effects).every((value) => value === 0),
          'FAILED_EXTRACTION_CREATED_ENTITIES',
        );
        const [usage] = await database.sqlClient.query(
          'SELECT user_id,feature,model,status,input_tokens,output_tokens,estimated_cost FROM ai_usage WHERE user_id=$1::uuid ORDER BY created_at DESC LIMIT 1',
          [userId],
        );
        check(
          usage?.user_id === userId &&
            usage.feature === 'workout_plan_import' &&
            usage.model === env.OPENAI_IMPORT_MODEL &&
            ['failed', 'timeout', 'invalid_output', 'no_program'].includes(
              String(usage.status),
            ),
          'FAILED_USAGE_METADATA_INVALID',
        );
        console.log(missing ? 'Missing-value fixture' : 'Simple fixture', {
          responsesApi: 'FAILED',
          provider: providerFailure,
          safeApiCode: error.code,
          zod: 'NOT_RUN',
          accuracy: 'NOT_VERIFIED',
          usage: {
            userVerified: true,
            feature: usage.feature,
            model: usage.model,
            status: usage.status,
            inputTokens: usage.input_tokens,
            outputTokens: usage.output_tokens,
            estimatedCost: usage.estimated_cost,
          },
          ...effects,
        });
      } finally {
        file.bytes.fill(0);
        providerPlan = undefined;
      }
    }
    check(responseCalls === fixtures.length, 'UNEXPECTED_RESPONSE_CALL_COUNT');
    const [usageCount] = await database.sqlClient.query(
      'SELECT count(*)::int AS n FROM ai_usage WHERE user_id=$1::uuid',
      [userId],
    );
    check(usageCount?.n === fixtures.length, 'UNEXPECTED_USAGE_COUNT');
    const columns = await database.sqlClient.query(
      "SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='ai_usage'",
    );
    check(
      columns.every((c) =>
        [
          'id',
          'user_id',
          'feature',
          'model',
          'input_tokens',
          'output_tokens',
          'estimated_cost',
          'status',
          'created_at',
        ].includes(String(c.column_name)),
      ),
      'UNEXPECTED_USAGE_CONTENT_COLUMN',
    );
    console.log('Summary', {
      responseCalls,
      inputTokens: inputTotal || null,
      outputTokens: outputTotal || null,
      usageContainsNoDocumentOrPrompt: true,
      noConfirmationPerformed: true,
      temporaryFilesWritten: 0,
      accuracy: accurate ? 'PASS' : 'FAILED',
      productionContacted: false,
    });
    if (!accurate) process.exitCode = 1;
  } finally {
    await extractor?.close();
    await dispatcher.close();
    if (verified) {
      await database.db.delete(users).where(eq(users.id, userId));
      console.log(
        'Synthetic user and its usage removed; existing user data preserved',
      );
    }
    await database.close();
  }
}
void main().catch((error: unknown) => {
  const knownCodes = new Set([
    'model_not_found',
    'invalid_api_key',
    'insufficient_quota',
    'rate_limit_exceeded',
    'unsupported_parameter',
    'invalid_json_schema',
  ]);
  const detail =
    error instanceof SmokeCheckError
      ? { check: error.message }
      : error instanceof ApiError
        ? { code: error.code }
        : error instanceof OpenAI.APIError
          ? {
              category: 'openai',
              status: error.status,
              code:
                error.code && knownCodes.has(error.code)
                  ? error.code
                  : 'provider_error',
            }
          : { category: 'configuration_database_or_network' };
  console.error('Real OpenAI smoke failed (sanitized)', detail);
  process.exitCode = 1;
});
