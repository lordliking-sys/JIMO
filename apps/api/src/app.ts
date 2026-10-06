import Fastify from 'fastify';
import cors from '@fastify/cors';
import type { DatabaseClient } from '@jimo/database';
import { noCurrentUser, type CurrentUserProvider } from './current-user';
import { installErrorHandler } from './errors';
import { ProgramService } from './program-service';
import { programRoutes } from './routes/programs';
import { healthRoutes } from './routes/health';
import { readyRoutes } from './routes/ready';
export function buildApp(
  options: {
    checkDatabase?: () => Promise<void>;
    database?: DatabaseClient;
    currentUser?: CurrentUserProvider;
    corsOrigins?: string[];
    logger?: boolean;
  } = {},
) {
  const app = Fastify({ logger: options.logger ?? true, bodyLimit: 64 * 1024 });
  installErrorHandler(app);
  app.register(cors, {
    origin: options.corsOrigins ?? [],
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'x-jimo-locale'],
  });
  if (options.database)
    app.register(programRoutes, {
      service: new ProgramService(options.database),
      currentUser: options.currentUser ?? noCurrentUser,
    });
  app.register(healthRoutes);
  app.register(readyRoutes, options);
  return app;
}
