import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { eq } from 'drizzle-orm';
import {
  createDatabase,
  assertDevelopment,
  safeDatabaseError,
  users,
  programs,
  exercises,
  type DatabaseClient,
} from '@jimo/database';
import {
  importReviewSchema,
  importConfirmationSchema,
  programDetailSchema,
  type ImportConfirmation,
} from '@jimo/schemas';
import { buildApp } from '../src/app';
import { ApiError } from '../src/errors';
import { FakeWorkoutPlanExtractor } from '../test/fixtures/fake-extractor';
import { ImportConfirmationService } from '../src/ai/imports/confirmation';
import { AiUsageService } from '../src/ai/usage';
import plan from '../test/fixtures/imports/plan.json';
const boundary = 'jimo-fixture-boundary';
function multipart(bytes: Buffer, extraField?: string) {
  return Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="locale"\r\n\r\nit\r\n`,
    ),
    ...(extraField
      ? [
          Buffer.from(
            `--${boundary}\r\nContent-Disposition: form-data; name="userId"\r\n\r\n${extraField}\r\n`,
          ),
        ]
      : []),
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="files"; filename="synthetic.pdf"\r\nContent-Type: application/pdf\r\n\r\n`,
    ),
    bytes,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);
}
test(
  'photo/PDF import against Neon development: auth, review-only extraction, atomic confirmation, idempotency, isolation and quotas',
  { skip: !process.env.DATABASE_URL },
  async (t) => {
    const c = createDatabase(process.env.DATABASE_URL!),
      a = randomUUID(),
      b = randomUUID(),
      fake = new FakeWorkoutPlanExtractor(),
      app = buildApp({
        database: c,
        aiImportEnabled: true,
        currentUser: async () => ({ id: a }),
        importExtractor: fake,
        importModel: 'fake-test-model',
        importLimits: { daily: 100, hourly: 20 },
        logger: false,
        checkDatabase: () => c.ping(),
      }),
      other = buildApp({
        database: c,
        aiImportEnabled: true,
        importExtractor: fake,
        currentUser: async () => ({ id: b }),
        logger: false,
      });
    let verified = false;
    const count = async (
      table: 'programs' | 'ai_usage' | 'import_confirmations' | 'exercises',
    ) =>
      Number(
        (
          await c.sqlClient.query(
            `SELECT count(*)::int AS n FROM ${table} WHERE ${table === 'exercises' ? 'created_by_user_id' : 'user_id'}=$1::uuid`,
            [a],
          )
        )[0]!.n,
      );
    const stage = (name: string, fn: () => Promise<void>) =>
      t.test(name, async () => {
        try {
          await fn();
        } catch (error) {
          if (error instanceof assert.AssertionError) throw error;
          throw new Error(
            `${name}: ${JSON.stringify(safeDatabaseError(error))}`,
          );
        }
      });
    let confirmation: ImportConfirmation, createdId: string;
    try {
      await assertDevelopment(c);
      verified = true;
      await c.db.insert(users).values([
        { id: a, displayName: 'JIMO_IMPORT_TEST_A' },
        { id: b, displayName: 'JIMO_IMPORT_TEST_B' },
      ]);
      await stage('health and readiness remain 200', async () => {
        for (const url of ['/health', '/ready'])
          assert.equal((await app.inject({ url })).statusCode, 200);
      });
      await stage(
        'valid PDF is analyzed once, no programs/custom exercises are created and ownership comes only from CurrentUser',
        async () => {
          const bytes = await readFile(
            resolve(__dirname, '../test/fixtures/imports/multi-day.pdf'),
          );
          const forged = await app.inject({
            method: 'POST',
            url: '/imports/workout-plan',
            headers: {
              'content-type': `multipart/form-data; boundary=${boundary}`,
            },
            payload: multipart(bytes, b),
          });
          assert.equal(forged.statusCode, 400);
          assert.equal(fake.calls, 0);
          const response = await app.inject({
            method: 'POST',
            url: '/imports/workout-plan',
            headers: {
              'content-type': `multipart/form-data; boundary=${boundary}`,
            },
            payload: multipart(bytes),
          });
          assert.equal(response.statusCode, 200);
          const review = importReviewSchema.parse(response.json());
          assert.equal(fake.calls, 1);
          assert.equal(await count('programs'), 0);
          assert.equal(await count('exercises'), 0);
          assert.equal(await count('ai_usage'), 1);
          const bench = review.matches[0]![0]!.exercise!;
          assert.equal(bench.canonicalName, 'Bench Press');
          assert.equal(review.matches[0]![3]!.exercise, null);
          confirmation = importConfirmationSchema.parse({
            confirmationKey: randomUUID(),
            importId: review.importId,
            program: { name: 'Upper' },
            days: [
              {
                name: 'Push',
                exercises: [
                  {
                    exerciseId: bench.id,
                    custom: null,
                    prescription: {
                      loadMode: 'external',
                      targetSets: 4,
                      targetReps: 8,
                      targetLoadKg: '80',
                      targetRpe: '8',
                      restSeconds: 180,
                    },
                  },
                ],
              },
            ],
          });
          const usage = await c.sqlClient.query(
            'SELECT status,input_tokens,output_tokens,estimated_cost FROM ai_usage WHERE id=$1::uuid',
            [review.importId],
          );
          assert.deepEqual(usage[0], {
            status: 'succeeded',
            input_tokens: 100,
            output_tokens: 80,
            estimated_cost: null,
          });
        },
      );
      await stage(
        'user B cannot confirm user A import; invalid prescription writes nothing',
        async () => {
          assert.equal(
            (
              await other.inject({
                method: 'POST',
                url: '/imports/workout-plan/confirm',
                payload: confirmation,
              })
            ).statusCode,
            404,
          );
          const invalid = structuredClone(confirmation);
          invalid.days[0]!.exercises[0]!.prescription.targetSets = 0;
          assert.equal(
            (
              await app.inject({
                method: 'POST',
                url: '/imports/workout-plan/confirm',
                payload: invalid,
              })
            ).statusCode,
            400,
          );
          assert.equal(await count('programs'), 0);
        },
      );
      await stage(
        'confirmation produces exactly one draft/day/exercise; concurrent double tap and retry return same program',
        async () => {
          const responses = await Promise.all([
            app.inject({
              method: 'POST',
              url: '/imports/workout-plan/confirm',
              payload: confirmation,
            }),
            app.inject({
              method: 'POST',
              url: '/imports/workout-plan/confirm',
              payload: confirmation,
            }),
          ]);
          for (const response of responses)
            assert.equal(response.statusCode, 201);
          const detail = programDetailSchema.parse(responses[0]!.json());
          createdId = detail.id;
          assert.equal(detail.status, 'draft');
          assert.equal(detail.days.length, 1);
          assert.equal(detail.days[0]!.exercises.length, 1);
          assert.equal(detail.days[0]!.exercises[0]!.targetLoadKg, '80.00');
          assert.equal(responses[1]!.json().id, createdId);
          assert.equal(await count('programs'), 1);
          assert.equal(await count('import_confirmations'), 1);
          const retry = await app.inject({
            method: 'POST',
            url: '/imports/workout-plan/confirm',
            payload: confirmation,
          });
          assert.equal(retry.statusCode, 201);
          assert.equal(retry.json().id, createdId);
          assert.equal(fake.calls, 1);
          const changed = structuredClone(confirmation);
          changed.program.name = 'Changed';
          assert.equal(
            (
              await app.inject({
                method: 'POST',
                url: '/imports/workout-plan/confirm',
                payload: changed,
              })
            ).statusCode,
            409,
          );
          assert.equal(await count('programs'), 1);
        },
      );
      await stage(
        'failure at exercise four rolls back program, days, prior prescriptions and explicitly requested custom exercise',
        async () => {
          const usage = new AiUsageService(c, 100, 20),
            importId = await usage.canUseAiFeature(
              a,
              'workout_plan_import',
              'fake-test-model',
            );
          await usage.finish(importId, 'succeeded');
          const doomed = randomUUID();
          await c.db.insert(exercises).values({
            id: doomed,
            canonicalName: 'Isolated fourth exercise',
            isCustom: true,
            createdByUserId: a,
            trackingMode: 'reps',
          });
          const sqlClient = new Proxy(c.sqlClient, {
            get(target, key) {
              if (key === 'transaction')
                return async (
                  ...args: Parameters<typeof target.transaction>
                ) => {
                  await c.db.delete(exercises).where(eq(exercises.id, doomed));
                  return target.transaction(...args);
                };
              return Reflect.get(target, key);
            },
          });
          const client = { ...c, sqlClient } as DatabaseClient,
            input = structuredClone(confirmation);
          input.importId = importId;
          input.confirmationKey = randomUUID();
          input.program.name = 'Atomic failure';
          input.days[0]!.exercises = [
            {
              ...input.days[0]!.exercises[0]!,
              exerciseId: null,
              custom: { name: 'Must roll back custom', trackingMode: 'reps' },
            },
            ...Array.from({ length: 2 }, () =>
              structuredClone(input.days[0]!.exercises[0]!),
            ),
            { ...input.days[0]!.exercises[0]!, exerciseId: doomed },
          ];
          await assert.rejects(() =>
            new ImportConfirmationService(client).confirm(a, input, 'it'),
          );
          assert.equal(await count('programs'), 1);
          assert.equal(await count('exercises'), 0);
          assert.equal(await count('import_confirmations'), 1);
          assert.equal(
            Number(
              (
                await c.sqlClient.query(
                  'SELECT count(*)::int AS n FROM program_days d JOIN programs p ON p.id=d.program_id WHERE p.user_id=$1::uuid',
                  [a],
                )
              )[0]!.n,
            ),
            1,
          );
        },
      );
      await stage(
        'invalid output/no program/provider failure map safely and log usage without document data',
        async () => {
          const bytes = await readFile(
            resolve(__dirname, '../test/fixtures/imports/multi-day.pdf'),
          );
          for (const [output, code] of [
            ['invalid-json', 'AI_INVALID_OUTPUT'],
            [{ ...plan, days: [] }, 'IMPORT_NO_PROGRAM'],
          ]) {
            fake.output = output;
            const r = await app.inject({
              method: 'POST',
              url: '/imports/workout-plan',
              headers: {
                'content-type': `multipart/form-data; boundary=${boundary}`,
              },
              payload: multipart(bytes),
            });
            assert.equal(r.statusCode, 422);
            assert.equal(r.json().error.code, code);
          }
          const statuses = await c.sqlClient.query(
            'SELECT status FROM ai_usage WHERE user_id=$1::uuid ORDER BY created_at',
            [a],
          );
          assert.ok(statuses.some((r) => r.status === 'invalid_output'));
          assert.ok(statuses.some((r) => r.status === 'no_program'));
        },
      );
      await stage(
        'quota reservations are concurrency safe and per account',
        async () => {
          const usage = new AiUsageService(c, 1, 1);
          const results = await Promise.allSettled([
            usage.canUseAiFeature(b, 'workout_plan_import', 'fake'),
            usage.canUseAiFeature(b, 'workout_plan_import', 'fake'),
          ]);
          assert.equal(
            results.filter((r) => r.status === 'fulfilled').length,
            1,
          );
          const rejected = results.find(
            (r) => r.status === 'rejected',
          ) as PromiseRejectedResult;
          assert.ok(
            rejected.reason instanceof ApiError &&
              rejected.reason.code === 'AI_RATE_LIMITED',
          );
        },
      );
      await stage(
        'deleted imported programs cannot be recreated by a stale retry',
        async () => {
          await c.db.delete(programs).where(eq(programs.id, createdId));
          const r = await app.inject({
            method: 'POST',
            url: '/imports/workout-plan/confirm',
            payload: confirmation,
          });
          assert.equal(r.statusCode, 410);
          assert.equal(await count('programs'), 0);
        },
      );
    } finally {
      await app.close();
      await other.close();
      if (verified) {
        await c.db.delete(programs).where(eq(programs.userId, a));
        await c.db.delete(exercises).where(eq(exercises.createdByUserId, a));
        await c.db.delete(users).where(eq(users.id, a));
        await c.db.delete(users).where(eq(users.id, b));
      }
      await c.close();
    }
  },
);
