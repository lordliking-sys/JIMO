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
    database: client,
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
