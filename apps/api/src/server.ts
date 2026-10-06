import { buildApp } from './app';
import { ApiConfigurationError, readEnv } from './env';
import { createDatabase, safeDatabaseError } from '@jimo/database';
async function main() {
  const env = readEnv();
  const database = createDatabase(env.DATABASE_URL);
  const app = buildApp({ checkDatabase: () => database.ping() });
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
