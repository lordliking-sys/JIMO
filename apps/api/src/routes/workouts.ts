import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ApiError } from '../errors';
import {
  startWorkoutSchema,
  finishWorkoutSchema,
  actualFieldsSchema,
  workoutHistoryQuerySchema,
} from '@jimo/schemas';
import type { CurrentUserProvider } from '../current-user';
import type { WorkoutService } from '../workout-service';
const idParams = z.object({ id: z.uuid() });
const empty = z.object({}).strict();
export async function workoutRoutes(
  app: FastifyInstance,
  options: { service: WorkoutService; currentUser: CurrentUserProvider },
) {
  const s = options.service,
    user: CurrentUserProvider = async (r) => {
      const current = await options.currentUser(r);
      const expected = r.headers['x-jimo-owner'];
      if (expected !== undefined && z.uuid().parse(expected) !== current.id)
        throw new ApiError(
          403,
          'IDENTITY_CHANGED',
          'Current identity has changed',
        );
      return current;
    };
  app.post('/workouts/start', async (r, reply) =>
    reply
      .code(201)
      .send(
        await s.start(
          (await user(r)).id,
          startWorkoutSchema.parse(r.body).programDayId,
          z.enum(['it', 'en']).default('en').parse(r.headers['x-jimo-locale']),
        ),
      ),
  );
  app.get('/workouts/active', async (r) => s.active((await user(r)).id));
  app.get('/workouts', async (r) =>
    s.history((await user(r)).id, workoutHistoryQuerySchema.parse(r.query)),
  );
  app.get('/workouts/:id', async (r) =>
    s.detail((await user(r)).id, idParams.parse(r.params).id),
  );
  app.post('/workout-sets/:id/complete', async (r) =>
    s.saveSet(
      (await user(r)).id,
      idParams.parse(r.params).id,
      actualFieldsSchema.parse(r.body),
    ),
  );
  app.patch('/workout-sets/:id', async (r) =>
    s.saveSet(
      (await user(r)).id,
      idParams.parse(r.params).id,
      actualFieldsSchema.parse(r.body),
      true,
    ),
  );
  app.post('/workout-sets/:id/skip', async (r) => {
    const u = await user(r);
    empty.parse(r.body ?? {});
    return s.skip(u.id, idParams.parse(r.params).id);
  });
  app.post('/workouts/:id/complete', async (r) =>
    s.finish(
      (await user(r)).id,
      idParams.parse(r.params).id,
      finishWorkoutSchema.parse(r.body ?? {}).skipPending,
    ),
  );
  app.post('/workouts/:id/cancel', async (r) => {
    const u = await user(r);
    empty.parse(r.body ?? {});
    return s.finish(u.id, idParams.parse(r.params).id, true, true);
  });
}
