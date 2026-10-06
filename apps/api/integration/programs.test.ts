import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { eq, and } from 'drizzle-orm';
import {
  createDatabase,
  assertDevelopment,
  safeDatabaseError,
  users,
  exercises,
  programs,
} from '@jimo/database';
import {
  programDetailSchema,
  programListSchema,
  exerciseListSchema,
  exerciseDtoSchema,
  type ProgramDetail,
} from '@jimo/schemas';
import { buildApp } from '../src/app';

test(
  'program management API against Neon development, two isolated users',
  { skip: !process.env.DATABASE_URL },
  async (t) => {
    const client = createDatabase(process.env.DATABASE_URL!),
      a = randomUUID(),
      b = randomUUID();
    let verified = false;
    const appA = buildApp({
        database: client,
        currentUser: async () => ({ id: a }),
        checkDatabase: () => client.ping(),
        logger: false,
        corsOrigins: ['http://localhost:4173'],
      }),
      appB = buildApp({
        database: client,
        currentUser: async () => ({ id: b }),
        logger: false,
      });
    const request = async (
      app: typeof appA,
      method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
      url: string,
      body?: unknown,
      status = 200,
      locale = 'it',
    ) => {
      const response = await app.inject({
        method,
        url,
        headers: { 'x-jimo-locale': locale },
        ...(body === undefined
          ? {}
          : {
              payload: JSON.stringify(body),
              headers: {
                'x-jimo-locale': locale,
                'content-type': 'application/json',
              },
            }),
      });
      assert.equal(response.statusCode, status, `${method} ${url}`);
      return response;
    };
    const detail = async (
      method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
      url: string,
      body?: unknown,
      status = 200,
    ) =>
      programDetailSchema.parse(
        (await request(appA, method, url, body, status)).json(),
      );
    const stage = async (name: string, action: () => Promise<void>) =>
      t.test(name, async () => {
        try {
          await action();
        } catch (error) {
          if (error instanceof assert.AssertionError) throw error;
          throw new Error(
            `${name}: ${JSON.stringify(safeDatabaseError(error))}`,
          );
        }
      });
    try {
      await assertDevelopment(client);
      verified = true;
      await client.db.insert(users).values([
        { id: a, displayName: `JIMO_API_TEST_A_${a}` },
        { id: b, displayName: `JIMO_API_TEST_B_${b}` },
      ]);
      let catalog = exerciseListSchema.parse(
        (await request(appA, 'GET', '/exercises?limit=100')).json(),
      );
      const bench = catalog.exercises.find(
          (e) => e.canonicalName === 'Bench Press',
        )!,
        dip = catalog.exercises.find((e) => e.canonicalName === 'Dip')!,
        pull = catalog.exercises.find((e) => e.canonicalName === 'Pull-Up')!,
        row = catalog.exercises.find((e) => e.canonicalName === 'Barbell Row')!,
        plank = catalog.exercises.find((e) => e.canonicalName === 'Plank')!;
      assert.ok(bench && dip && pull && row && plank);
      let upper = await detail(
        'POST',
        '/programs',
        {
          name: 'Upper 4 giorni',
          description: 'JIMO integration example',
          durationWeeks: 6,
          startsOn: '2026-10-06',
        },
        201,
      );
      let other: ProgramDetail;
      const customB = exerciseDtoSchema.parse(
        (
          await request(
            appB,
            'POST',
            '/exercises',
            {
              name: 'Private B',
              trackingMode: 'reps',
              defaultLoadMode: 'bodyweight',
            },
            201,
          )
        ).json(),
      );
      const programB = programDetailSchema.parse(
        (
          await request(
            appB,
            'POST',
            '/programs',
            { name: 'Private program B' },
            201,
          )
        ).json(),
      );
      const bDayProgram = programDetailSchema.parse(
        (
          await request(
            appB,
            'POST',
            `/programs/${programB.id}/days`,
            { name: 'Private day' },
            201,
          )
        ).json(),
      );
      const bDay = bDayProgram.days[0]!;
      const bFull = programDetailSchema.parse(
        (
          await request(
            appB,
            'POST',
            `/program-days/${bDay.id}/exercises`,
            {
              exerciseId: customB.id,
              loadMode: 'bodyweight',
              targetSets: 3,
              targetReps: 10,
            },
            201,
          )
        ).json(),
      );
      const bPrescription = bFull.days[0]!.exercises[0]!;
      await request(appB, 'POST', `/programs/${programB.id}/activate`);
      await stage('health/readiness and CORS', async () => {
        await request(appA, 'GET', '/health');
        await request(appA, 'GET', '/ready');
        const preflight = await appA.inject({
          method: 'OPTIONS',
          url: '/programs',
          headers: {
            origin: 'http://localhost:4173',
            'access-control-request-method': 'POST',
            'access-control-request-headers': 'content-type,x-jimo-locale',
          },
        });
        assert.equal(preflight.statusCode, 204);
        assert.equal(
          preflight.headers['access-control-allow-origin'],
          'http://localhost:4173',
        );
      });
      await stage(
        'translated exercises, search, cursor and fallback',
        async () => {
          assert.equal(bench.displayName, 'Panca piana');
          const en = exerciseListSchema.parse(
            (
              await request(
                appA,
                'GET',
                '/exercises?search=bench',
                undefined,
                200,
                'en',
              )
            ).json(),
          );
          assert.equal(en.exercises[0]?.displayName, 'Bench Press');
          const it = exerciseListSchema.parse(
            (await request(appA, 'GET', '/exercises?search=PANCA')).json(),
          );
          assert.equal(it.exercises[0]?.id, bench.id);
          const literal = exerciseDtoSchema.parse(
            (
              await request(
                appA,
                'POST',
                '/exercises',
                {
                  name: String.raw`Literal % _ \ lookup`,
                  trackingMode: 'reps',
                },
                201,
              )
            ).json(),
          );
          for (const search of ['%', '_', '\\']) {
            const matches = exerciseListSchema.parse(
              (
                await request(
                  appA,
                  'GET',
                  `/exercises?search=${encodeURIComponent(search)}`,
                )
              ).json(),
            );
            assert.deepEqual(
              matches.exercises.map((e) => e.id),
              [literal.id],
            );
          }
          const first = exerciseListSchema.parse(
            (await request(appA, 'GET', '/exercises?limit=2')).json(),
          );
          assert.ok(first.nextCursor);
          const next = exerciseListSchema.parse(
            (
              await request(
                appA,
                'GET',
                `/exercises?limit=2&cursor=${first.nextCursor}`,
              )
            ).json(),
          );
          assert.ok(
            !next.exercises.some((e) =>
              first.exercises.some((x) => x.id === e.id),
            ),
          );
          await request(
            appA,
            'GET',
            `/exercises/${customB.id}`,
            undefined,
            404,
          );
          const timed = exerciseListSchema.parse(
            (
              await request(appA, 'GET', '/exercises?trackingMode=duration')
            ).json(),
          );
          assert.ok(
            timed.exercises.every((e) => e.trackingMode === 'duration'),
          );
        },
      );
      await stage(
        'program create, list, detail and metadata update',
        async () => {
          assert.equal(upper.status, 'draft');
          const list = programListSchema.parse(
            (await request(appA, 'GET', '/programs')).json(),
          );
          assert.ok(list.programs.some((p) => p.id === upper.id));
          assert.ok(!list.programs.some((p) => p.id === programB.id));
          upper = await detail('PATCH', `/programs/${upper.id}`, {
            description: 'Updated metadata',
          });
          assert.equal(upper.name, 'Upper 4 giorni');
          assert.equal(upper.description, 'Updated metadata');
          await request(
            appA,
            'POST',
            '/programs',
            { name: 'spoof', userId: b },
            400,
          );
          await request(
            appA,
            'PATCH',
            `/programs/${upper.id}`,
            { status: 'active' },
            400,
          );
        },
      );
      await stage(
        'days create, update, reorder and invalid reorder keep positions',
        async () => {
          upper = await detail(
            'POST',
            `/programs/${upper.id}/days`,
            { name: 'Push' },
            201,
          );
          upper = await detail(
            'POST',
            `/programs/${upper.id}/days`,
            { name: 'Pull' },
            201,
          );
          upper = await detail(
            'POST',
            `/programs/${upper.id}/days`,
            { name: 'Extra' },
            201,
          );
          const extra = upper.days[2]!;
          upper = await detail('PATCH', `/program-days/${extra.id}`, {
            name: 'Extra renamed',
            dayOfWeek: 3,
          });
          assert.equal(upper.days[2]?.name, 'Extra renamed');
          upper = await detail('POST', `/programs/${upper.id}/days/reorder`, {
            ids: [extra.id, upper.days[0]!.id, upper.days[1]!.id],
          });
          assert.deepEqual(
            upper.days.map((d) => d.position),
            [0, 1, 2],
          );
          assert.equal(upper.days[0]?.id, extra.id);
          for (const ids of [
            [],
            [extra.id],
            [extra.id, extra.id],
            [extra.id, bDay.id],
          ])
            await request(
              appA,
              'POST',
              `/programs/${upper.id}/days/reorder`,
              { ids },
              ids.length === 2 && ids[0] === ids[1] ? 400 : 409,
            );
          upper = await detail('DELETE', `/program-days/${extra.id}`);
          assert.deepEqual(
            upper.days.map((d) => [d.name, d.position]),
            [
              ['Push', 0],
              ['Pull', 1],
            ],
          );
        },
      );
      await stage(
        'full Upper example: external, weighted, fixed/range and decimal/RPE targets',
        async () => {
          const push = upper.days[0]!,
            pullDay = upper.days[1]!;
          upper = await detail(
            'POST',
            `/program-days/${push.id}/exercises`,
            {
              exerciseId: bench.id,
              loadMode: 'external',
              targetSets: 4,
              targetReps: 8,
              targetLoadKg: '80',
              restSeconds: 180,
              targetRpe: '8',
            },
            201,
          );
          upper = await detail(
            'POST',
            `/program-days/${push.id}/exercises`,
            {
              exerciseId: dip.id,
              loadMode: 'weighted',
              targetSets: 3,
              targetRepMin: 8,
              targetRepMax: 12,
              targetLoadKg: '10',
              restSeconds: 120,
            },
            201,
          );
          upper = await detail(
            'POST',
            `/program-days/${pullDay.id}/exercises`,
            {
              exerciseId: pull.id,
              loadMode: 'weighted',
              targetSets: 4,
              targetReps: 8,
              targetLoadKg: '20',
              restSeconds: 180,
              targetRpe: '8',
            },
            201,
          );
          upper = await detail(
            'POST',
            `/program-days/${pullDay.id}/exercises`,
            {
              exerciseId: row.id,
              loadMode: 'external',
              targetSets: 4,
              targetReps: 10,
              targetLoadKg: '70',
              restSeconds: 120,
            },
            201,
          );
          const reopened = await detail('GET', `/programs/${upper.id}`);
          assert.equal(reopened.days[0]?.exercises[0]?.targetLoadKg, '80.00');
          assert.equal(reopened.days[0]?.exercises[0]?.targetRpe, '8.0');
          assert.equal(
            reopened.days[0]?.exercises[0]?.exercise.displayName,
            'Panca piana',
          );
          assert.equal(reopened.days[0]?.exercises[1]?.targetReps, null);
          assert.equal(reopened.days[0]?.exercises[1]?.targetRepMax, 12);
          const first = reopened.days[0]!.exercises[0]!;
          upper = await detail('PATCH', `/program-exercises/${first.id}`, {
            targetLoadKg: '82.5',
            targetRpe: '8.5',
            notes: 'Controlled update',
          });
          assert.equal(upper.days[0]?.exercises[0]?.targetLoadKg, '82.50');
        },
      );
      await stage(
        'custom exercises deduplicate by owner and stay private',
        async () => {
          const custom = exerciseDtoSchema.parse(
            (
              await request(
                appA,
                'POST',
                '/exercises',
                {
                  name: '  Push-Up Deficit  ',
                  trackingMode: 'reps',
                  defaultLoadMode: 'bodyweight',
                },
                201,
              )
            ).json(),
          );
          assert.equal(custom.displayName, 'Push-Up Deficit');
          await request(
            appA,
            'POST',
            '/exercises',
            { name: 'push-up deficit', trackingMode: 'reps' },
            409,
          );
          catalog = exerciseListSchema.parse(
            (await request(appB, 'GET', '/exercises?limit=100')).json(),
          );
          assert.ok(!catalog.exercises.some((e) => e.id === custom.id));
          upper = await detail(
            'POST',
            `/program-days/${upper.days[0]!.id}/exercises`,
            {
              exerciseId: custom.id,
              loadMode: 'bodyweight',
              targetSets: 3,
              targetReps: 10,
            },
            201,
          );
          await request(
            appA,
            'POST',
            `/program-days/${upper.days[0]!.id}/exercises`,
            {
              exerciseId: customB.id,
              loadMode: 'bodyweight',
              targetSets: 3,
              targetReps: 10,
            },
            404,
          );
        },
      );
      await stage(
        'duration, assistance, tracking/load constraints and invalid values',
        async () => {
          const day = upper.days[0]!;
          upper = await detail(
            'POST',
            `/program-days/${day.id}/exercises`,
            {
              exerciseId: plank.id,
              loadMode: 'bodyweight',
              targetSets: 3,
              targetDurationSeconds: 60,
            },
            201,
          );
          assert.equal(
            upper.days[0]?.exercises.at(-1)?.targetDurationSeconds,
            60,
          );
          upper = await detail(
            'POST',
            `/program-days/${day.id}/exercises`,
            {
              exerciseId: pull.id,
              loadMode: 'assisted',
              targetSets: 3,
              targetReps: 10,
              targetAssistanceKg: '15',
            },
            201,
          );
          assert.equal(
            upper.days[0]?.exercises.at(-1)?.targetAssistanceKg,
            '15.00',
          );
          const base = {
            exerciseId: bench.id,
            loadMode: 'external',
            targetSets: 4,
            targetReps: 8,
            targetLoadKg: '1.25',
          };
          for (const patch of [
            { targetRpe: '10.5' },
            { targetRpe: '8.3' },
            { targetRpe: 8 },
            { targetLoadKg: 1.25 },
            { targetLoadKg: '-1' },
            { targetSets: 0 },
            { targetReps: 8, targetDurationSeconds: 60 },
            { targetRepMin: 8, targetRepMax: 12 },
            { targetReps: null, targetRepMin: 12, targetRepMax: 8 },
            { loadMode: 'bodyweight' },
            { loadMode: 'assisted' },
            { targetAssistanceKg: '10' },
            { restSeconds: -1 },
            { notes: 'x'.repeat(2001) },
            { exerciseId: plank.id },
          ])
            await request(
              appA,
              'POST',
              `/program-days/${day.id}/exercises`,
              { ...base, ...patch },
              400,
            );
          await request(
            appA,
            'POST',
            `/program-days/${day.id}/exercises`,
            { exerciseId: bench.id, loadMode: 'bodyweight', targetSets: 3 },
            400,
          );
        },
      );
      await stage(
        'prescription reorder, remove and normalized positions',
        async () => {
          const day = upper.days[0]!,
            ids = day.exercises.map((e) => e.id).reverse();
          upper = await detail(
            'POST',
            `/program-days/${day.id}/exercises/reorder`,
            { ids },
          );
          assert.deepEqual(
            upper.days[0]?.exercises.map((e) => e.id),
            ids,
          );
          assert.deepEqual(
            upper.days[0]?.exercises.map((e) => e.position),
            ids.map((_, i) => i),
          );
          await request(
            appA,
            'POST',
            `/program-days/${day.id}/exercises/reorder`,
            { ids: [] },
            409,
          );
          upper = await detail('DELETE', `/program-exercises/${ids[0]}`);
          assert.deepEqual(
            upper.days[0]?.exercises.map((e) => e.position),
            upper.days[0]!.exercises.map((_, i) => i),
          );
        },
      );
      await stage(
        'activate is atomic; one active per user under concurrent activation',
        async () => {
          upper = await detail('POST', `/programs/${upper.id}/activate`);
          assert.equal(upper.status, 'active');
          other = await detail('POST', '/programs', { name: 'Other A' }, 201);
          await Promise.all([
            detail('POST', `/programs/${upper.id}/activate`),
            detail('POST', `/programs/${other.id}/activate`),
          ]);
          const active = await client.db
            .select()
            .from(programs)
            .where(and(eq(programs.userId, a), eq(programs.status, 'active')));
          assert.equal(active.length, 1);
          const bActive = await client.db
            .select()
            .from(programs)
            .where(and(eq(programs.userId, b), eq(programs.status, 'active')));
          assert.equal(bActive.length, 1);
          assert.equal(bActive[0]?.id, programB.id);
          const response = await request(
            appA,
            'POST',
            `/programs/${programB.id}/activate`,
            undefined,
            404,
          );
          assert.equal(response.json().error.code, 'PROGRAM_NOT_FOUND');
          assert.equal(
            (
              await client.db
                .select()
                .from(programs)
                .where(
                  and(eq(programs.userId, a), eq(programs.status, 'active')),
                )
            )[0]?.id,
            active[0]?.id,
          );
          try {
            await client.db.insert(programs).values({
              userId: a,
              name: 'Invalid duplicate active',
              status: 'active',
            });
            assert.fail('Unique active constraint missing');
          } catch (error) {
            if (error instanceof assert.AssertionError) throw error;
            assert.equal(safeDatabaseError(error).code, '23505');
          }
        },
      );
      await stage(
        'every private read/write path enforces user ownership',
        async () => {
          const denied: [
            'GET' | 'POST' | 'PATCH' | 'DELETE',
            string,
            unknown?,
          ][] = [
            ['GET', `/programs/${programB.id}`],
            ['PATCH', `/programs/${programB.id}`, { name: 'stolen' }],
            ['POST', `/programs/${programB.id}/archive`],
            ['POST', `/programs/${programB.id}/activate`],
            ['POST', `/programs/${programB.id}/days`, { name: 'stolen' }],
            [
              'POST',
              `/programs/${programB.id}/days/reorder`,
              { ids: [bDay.id] },
            ],
            ['PATCH', `/program-days/${bDay.id}`, { name: 'stolen' }],
            ['DELETE', `/program-days/${bDay.id}`],
            [
              'POST',
              `/program-days/${bDay.id}/exercises`,
              {
                exerciseId: bench.id,
                loadMode: 'external',
                targetSets: 3,
                targetReps: 8,
              },
            ],
            [
              'POST',
              `/program-days/${bDay.id}/exercises/reorder`,
              { ids: [bPrescription.id] },
            ],
            [
              'PATCH',
              `/program-exercises/${bPrescription.id}`,
              { targetReps: 99 },
            ],
            ['DELETE', `/program-exercises/${bPrescription.id}`],
          ];
          for (const [method, url, body] of denied)
            await request(appA, method, url, body, 404);
          const custom = exerciseListSchema.parse(
            (await request(appA, 'GET', '/exercises?limit=100')).json(),
          );
          assert.ok(!custom.exercises.some((e) => e.id === customB.id));
          assert.equal(
            (
              await client.db
                .select()
                .from(programs)
                .where(eq(programs.id, programB.id))
            )[0]?.status,
            'active',
          );
        },
      );
      await stage(
        'archive active program preserves structure and clears active selection',
        async () => {
          upper = await detail('POST', `/programs/${upper.id}/activate`);
          const before = upper.days.length;
          upper = await detail('POST', `/programs/${upper.id}/archive`);
          assert.equal(upper.status, 'archived');
          assert.equal(upper.days.length, before);
          assert.equal(
            (
              await client.db
                .select()
                .from(programs)
                .where(
                  and(eq(programs.userId, a), eq(programs.status, 'active')),
                )
            ).length,
            0,
          );
        },
      );
    } catch (error) {
      if (error instanceof assert.AssertionError) throw error;
      throw new Error(
        `Neon API test failed: ${JSON.stringify(safeDatabaseError(error))}`,
      );
    } finally {
      await appA.close();
      await appB.close();
      try {
        if (verified) {
          for (const id of [a, b]) {
            await client.db.delete(programs).where(eq(programs.userId, id));
            await client.db
              .delete(exercises)
              .where(eq(exercises.createdByUserId, id));
            await client.db.delete(users).where(eq(users.id, id));
            assert.equal(
              (await client.db.select().from(users).where(eq(users.id, id)))
                .length,
              0,
            );
          }
        }
      } catch (error) {
        throw new Error(
          `Neon API cleanup failed: ${JSON.stringify(safeDatabaseError(error))}`,
        );
      } finally {
        await client.close();
      }
    }
  },
);
