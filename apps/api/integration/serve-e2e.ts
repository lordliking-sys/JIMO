import { FakeWorkoutPlanExtractor } from '../test/fixtures/fake-extractor';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import {
  createDatabase,
  assertDevelopment,
  safeDatabaseError,
  users,
  programs,
  workoutSessions,
  exercises,
} from '@jimo/database';
import { buildApp } from '../src/app';
async function run() {
  if (process.env.NODE_ENV !== 'test' || !process.env.DATABASE_URL)
    throw new Error('E2E API requires test mode and development database');
  const client = createDatabase(process.env.DATABASE_URL),
    userId = randomUUID();
  let verified = false;
  const cleanup = async () => {
    if (!verified) return;
    await client.db
      .delete(workoutSessions)
      .where(eq(workoutSessions.userId, userId));
    await client.db.delete(programs).where(eq(programs.userId, userId));
    await client.db
      .delete(exercises)
      .where(eq(exercises.createdByUserId, userId));
    await client.db.delete(users).where(eq(users.id, userId));
  };
  const app = buildApp({
    aiImportEnabled: process.env.EXPO_PUBLIC_AI_IMPORT_ENABLED === 'true',
    database: client,
    importExtractor: new FakeWorkoutPlanExtractor(undefined, 500),
    importModel: 'fake-e2e-model',
    importLimits: { daily: 100, hourly: 20 },
    currentUser: async () => ({ id: userId }),
    checkDatabase: () => client.ping(),
    corsOrigins: ['http://localhost:4173'],
    logger: false,
  });
  app.addHook('onClose', async () => {
    try {
      if (verified) {
        await cleanup();
        console.log('E2E isolated data cleaned');
      }
    } finally {
      await client.close();
    }
  });
  try {
    await assertDevelopment(client);
    verified = true;
    await client.db
      .insert(users)
      .values({ id: userId, displayName: `JIMO_E2E_TEST_${userId}` });
    // Only this loopback-only, development-guarded test harness exposes cleanup.
    // Await it before Playwright terminates the process tree.
    app.post('/__e2e/reset-imports', async () => {
      const rows = await client.sqlClient.query(
        'SELECT program_id FROM import_confirmations WHERE user_id=$1::uuid AND program_id IS NOT NULL',
        [userId],
      );
      const ids = rows.map((r) => String(r.program_id));
      const custom = ids.length
        ? await client.sqlClient.query(
            'SELECT DISTINCT e.id FROM exercises e JOIN program_exercises pe ON pe.exercise_id=e.id JOIN program_days d ON d.id=pe.program_day_id WHERE d.program_id=ANY($1::uuid[]) AND e.is_custom AND e.created_by_user_id=$2::uuid',
            [ids, userId],
          )
        : [];
      await client.sqlClient.transaction([
        client.sqlClient.query(
          'DELETE FROM programs WHERE id=ANY($1::uuid[]) AND user_id=$2::uuid',
          [ids, userId],
        ),
        client.sqlClient.query(
          'DELETE FROM exercises WHERE id=ANY($1::uuid[]) AND created_by_user_id=$2::uuid AND NOT EXISTS(SELECT 1 FROM program_exercises pe WHERE pe.exercise_id=exercises.id)',
          [custom.map((e) => String(e.id)), userId],
        ),
        client.sqlClient.query('DELETE FROM ai_usage WHERE user_id=$1::uuid', [
          userId,
        ]),
      ]);
      return { cleaned: true };
    });
    app.post('/__e2e/cleanup', async () => {
      await cleanup();
      return { cleaned: true };
    });
    await app.listen({
      host: '127.0.0.1',
      port: Number(process.env.E2E_API_PORT ?? 4301),
    });
    for (const signal of ['SIGINT', 'SIGTERM'] as const)
      process.once(signal, () => {
        void app.close().catch((error) => {
          console.error('E2E cleanup failed', safeDatabaseError(error));
          process.exitCode = 1;
        });
      });
    console.log('E2E API ready on development with isolated user');
  } catch (error) {
    await app.close();
    throw error;
  }
}
void run().catch((error) => {
  console.error('E2E API startup failed', safeDatabaseError(error));
  process.exitCode = 1;
});
