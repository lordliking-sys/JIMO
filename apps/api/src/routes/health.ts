import type { FastifyInstance } from 'fastify';
import type { HealthStatus } from '@jimo/types';
import { healthStatusSchema } from '@jimo/schemas';
export async function healthRoutes(app: FastifyInstance) {
  app.get<{ Reply: HealthStatus }>('/health', async () =>
    healthStatusSchema.parse({ status: 'ok', service: 'jimo-api' }),
  );
}
