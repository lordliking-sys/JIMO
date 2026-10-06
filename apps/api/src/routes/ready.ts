import type { FastifyInstance } from 'fastify';
import { safeDatabaseError } from '@jimo/database';

export async function readyRoutes(
  app: FastifyInstance,
  options: { checkDatabase?: () => Promise<void> },
) {
  app.get('/ready', async (_request, reply) => {
    try {
      if (!options.checkDatabase)
        throw new Error('Database probe not configured');
      await options.checkDatabase();
      return { status: 'ready', database: 'ok' };
    } catch (error) {
      app.log.warn(
        { event: 'database_readiness_failed', ...safeDatabaseError(error) },
        'Database unavailable',
      );
      return reply
        .code(503)
        .send({ status: 'not_ready', database: 'unavailable' });
    }
  });
}
