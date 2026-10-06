import Fastify from 'fastify';
import { healthRoutes } from './routes/health';
import { readyRoutes } from './routes/ready';
export function buildApp(
  options: { checkDatabase?: () => Promise<void> } = {},
) {
  const app = Fastify({ logger: true });
  app.register(healthRoutes);
  app.register(readyRoutes, options);
  return app;
}
