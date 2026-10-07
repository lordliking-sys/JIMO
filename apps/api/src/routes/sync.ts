import type { FastifyInstance } from 'fastify';
import { syncRequestSchema } from '@jimo/schemas';
import type { CurrentUserProvider } from '../current-user';
import type { WorkoutSyncService } from '../workout-sync';
import { ApiError } from '../errors';
export async function syncRoutes(
  app: FastifyInstance,
  options: { service: WorkoutSyncService; currentUser: CurrentUserProvider },
) {
  app.get('/sync/identity', async (r) =>
    options.service.identity((await options.currentUser(r)).id),
  );
  app.post(
    '/sync/workout-operations',
    { bodyLimit: 1024 * 1024 },
    async (r) => {
      const user = await options.currentUser(r),
        input = syncRequestSchema.parse(r.body);
      // The claim never supplies identity; it only prevents dispatch to a different account.
      if (input.expectedUserId !== user.id)
        throw new ApiError(
          403,
          'IDENTITY_CHANGED',
          'Current identity has changed',
        );
      return options.service.process(user.id, input.operations);
    },
  );
}
