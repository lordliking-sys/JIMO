import { importRoutes } from './routes/imports';
import { WorkoutPlanImportService } from './ai/imports/workoutPlanImport';
import { ImportConfirmationService } from './ai/imports/confirmation';
import type { WorkoutPlanExtractor } from './ai/client';
import { ProgressService } from './progress-service';
import { progressRoutes } from './routes/progress';
import { WorkoutSyncService } from './workout-sync';
import { syncRoutes } from './routes/sync';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import type { DatabaseClient } from '@jimo/database';
import { noCurrentUser, type CurrentUserProvider } from './current-user';
import { installErrorHandler } from './errors';
import { WorkoutService } from './workout-service';
import { workoutRoutes } from './routes/workouts';
import { ProgramService } from './program-service';
import { programRoutes } from './routes/programs';
import { healthRoutes } from './routes/health';
import { readyRoutes } from './routes/ready';
import { ProfileService } from './profile-service';
import { meRoutes } from './routes/me';
import type { Writable } from 'node:stream';
export function buildApp(
  options: {
    now?: () => Date;
    checkDatabase?: () => Promise<void>;
    database?: DatabaseClient;
    currentUser?: CurrentUserProvider;
    corsOrigins?: string[];
    importExtractor?: WorkoutPlanExtractor;
    aiImportEnabled?: boolean;
    importModel?: string;
    importLimits?: { daily: number; hourly: number };
    logger?: boolean;
    loggerStream?: Writable;
  } = {},
) {
  const app = Fastify({
    logger:
      options.logger === false
        ? false
        : {
            redact: {
              paths: [
                'req.headers.authorization',
                'req.headers.cookie',
                'res.headers["set-cookie"]',
                '*.token',
                '*.secretKey',
                '*.password',
              ],
              censor: '[REDACTED]',
            },
            ...(options.loggerStream ? { stream: options.loggerStream } : {}),
            serializers: {
              req: (req) => ({
                method: req.method,
                url: req.url.split('?')[0] ?? '/',
                remoteAddress: req.ip,
              }),
            },
          },
    bodyLimit: 64 * 1024,
    requestTimeout: 180_000,
  });
  installErrorHandler(app);
  app.addHook('onSend', async (_request, reply, payload) => {
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('Cache-Control', 'no-store');
    return payload;
  });
  app.register(cors, {
    origin: options.corsOrigins ?? [],
    credentials: false,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-jimo-locale',
      'x-jimo-owner',
    ],
  });
  const importEnabled =
    options.aiImportEnabled === true &&
    !!options.importExtractor &&
    !!options.database;
  app.get('/features', async () => ({
    workoutPlanImport: importEnabled,
    aiProgramCreation: false as const,
  }));
  if (options.database) {
    app.register(importRoutes, {
      enabled: importEnabled,
      service: new WorkoutPlanImportService(
        options.database,
        options.importExtractor,
        options.importModel ?? 'unconfigured',
        options.importLimits,
      ),
      confirmation: new ImportConfirmationService(options.database),
      currentUser: options.currentUser ?? noCurrentUser,
    });
    app.register(meRoutes, {
      service: new ProfileService(options.database),
      currentUser: options.currentUser ?? noCurrentUser,
    });
    app.register(progressRoutes, {
      service: new ProgressService(options.database, options.now),
      currentUser: options.currentUser ?? noCurrentUser,
    });
    app.register(syncRoutes, {
      service: new WorkoutSyncService(options.database),
      currentUser: options.currentUser ?? noCurrentUser,
    });
    app.register(programRoutes, {
      service: new ProgramService(options.database),
      currentUser: options.currentUser ?? noCurrentUser,
    });
    app.register(workoutRoutes, {
      service: new WorkoutService(options.database),
      currentUser: options.currentUser ?? noCurrentUser,
    });
  }
  app.register(healthRoutes);
  app.register(readyRoutes, options);
  return app;
}
