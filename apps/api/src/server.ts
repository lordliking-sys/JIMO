import { OpenAIWorkoutPlanExtractor } from './ai/client';
import { ClerkAuthProvider } from './auth/provider';
import { authenticatedCurrentUser, CurrentUserResolver } from './auth/resolver';
import { buildApp } from './app';
import { developmentCurrentUser } from './current-user';
import { ApiConfigurationError, readEnv } from './env';
import {
  createDatabase,
  safeDatabaseError,
  assertDevelopment,
} from '@jimo/database';
async function main() {
  const env = readEnv();
  const database = createDatabase(env.DATABASE_URL);
  let currentUser;
  try {
    if (env.NODE_ENV !== 'production')
      await assertDevelopment(database, env.NEON_DEVELOPMENT_BRANCH_ID);
    currentUser =
      env.CLERK_SECRET_KEY && env.CLERK_ISSUER_URL
        ? authenticatedCurrentUser(
            new ClerkAuthProvider({
              secretKey: env.CLERK_SECRET_KEY,
              issuer: env.CLERK_ISSUER_URL,
              authorizedParties:
                env.CLERK_AUTHORIZED_PARTIES?.split(',')
                  .map((v) => v.trim())
                  .filter(Boolean) ?? [],
              ...(env.CLERK_JWT_KEY ? { jwtKey: env.CLERK_JWT_KEY } : {}),
            }),
            new CurrentUserResolver(database),
          )
        : await developmentCurrentUser(database, {
            allowDevAuth: env.ALLOW_DEV_AUTH === 'true',
            mode: env.NODE_ENV,
            ...(env.DEV_USER_ID ? { userId: env.DEV_USER_ID } : {}),
            ...(env.NEON_DEVELOPMENT_BRANCH_ID
              ? { branchId: env.NEON_DEVELOPMENT_BRANCH_ID }
              : {}),
          });
  } catch {
    await database.close();
    throw new ApiConfigurationError(
      'Authentication setup failed; check provider configuration and confirmed development branch',
    );
  }
  const corsOrigins =
    env.API_ALLOWED_ORIGINS?.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean) ??
    (env.NODE_ENV === 'production'
      ? []
      : ['http://localhost:8081', 'http://localhost:4173']);
  const importExtractor = env.OPENAI_API_KEY
    ? new OpenAIWorkoutPlanExtractor(
        env.OPENAI_IMPORT_MODEL,
        env.OPENAI_API_KEY,
      )
    : undefined;
  const app = buildApp({
    database,
    currentUser,
    importModel: env.OPENAI_IMPORT_MODEL,
    importLimits: {
      daily: env.AI_IMPORT_DAILY_LIMIT,
      hourly: env.AI_IMPORT_HOURLY_LIMIT,
    },
    ...(importExtractor ? { importExtractor } : {}),
    corsOrigins,
    checkDatabase: () => database.ping(),
  });
  app.addHook('onClose', async () => {
    await importExtractor?.close();
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
