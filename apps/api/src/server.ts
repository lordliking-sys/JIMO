import { buildApp } from './app';
import { developmentCurrentUser } from './current-user';
import { ApiConfigurationError, readEnv } from './env';
import { createDatabase, safeDatabaseError } from '@jimo/database';
async function main() {
  const env = readEnv();
  const database = createDatabase(env.DATABASE_URL);
  let currentUser;
  try {
    currentUser = await developmentCurrentUser(database, {
      mode: env.NODE_ENV,
      ...(env.DEV_USER_ID ? { userId: env.DEV_USER_ID } : {}),
      ...(env.NEON_DEVELOPMENT_BRANCH_ID
        ? { branchId: env.NEON_DEVELOPMENT_BRANCH_ID }
        : {}),
    });
  } catch {
    await database.close();
    throw new ApiConfigurationError(
      'Development identity requires the confirmed development branch and an existing DEV_USER_ID when supplied',
    );
  }
  const corsOrigins =
    env.API_ALLOWED_ORIGINS?.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean) ??
    (env.NODE_ENV === 'production'
      ? []
      : ['http://localhost:8081', 'http://localhost:4173']);
  const app = buildApp({
    database,
    currentUser,
    corsOrigins,
    checkDatabase: () => database.ping(),
  });
  app.addHook('onClose', async () => {
    await database.close();
  });
  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.once(signal, () => {
      void app.close().catch((error: unknown) => {
        app.log.error({
          event: 'shutdown_failed',
          ...safeDatabaseError(error),
        });
        process.exitCode = 1;
      });
    });
  }
  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' });
  } catch (error) {
    await app.close();
    throw error;
  }
}
void main().catch((error: unknown) => {
  console.error(
    error instanceof ApiConfigurationError
      ? error.message
      : 'API startup failed',
    safeDatabaseError(error),
  );
  process.exitCode = 1;
});
