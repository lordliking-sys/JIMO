import { z } from 'zod';
import { ApiError } from '../errors';
import type { FastifyInstance } from 'fastify';
import { progressQuerySchema, progressListQuerySchema } from '@jimo/schemas';
import type { CurrentUserProvider } from '../current-user';
import type { ProgressService } from '../progress-service';
const params = z.object({ id: z.uuid() }).strict();
const recordQuery = progressQuerySchema.extend({
  cursor: z
    .string()
    .max(200)
    .regex(
      /^[0-9a-f-]{36}:(reps|duration):(external|weighted|assisted|bodyweight):(MAX_REPS|MAX_LOAD|MAX_DURATION|MIN_ASSISTANCE)$/,
    )
    .optional(),
  limit: z.coerce.number().int().min(1).max(50).default(30),
});
const localeOf = (value: unknown) =>
  z.enum(['it', 'en']).default('en').parse(value);
export async function progressRoutes(
  app: FastifyInstance,
  options: { service: ProgressService; currentUser: CurrentUserProvider },
) {
  const s = options.service,
    u: CurrentUserProvider = async (r) => {
      const user = await options.currentUser(r);
      const expected = r.headers['x-jimo-owner'];
      if (expected !== undefined && z.uuid().parse(expected) !== user.id)
        throw new ApiError(
          403,
          'IDENTITY_CHANGED',
          'Current identity has changed',
        );
      return user;
    };
  app.get('/progress/summary', async (r) =>
    s.summary((await u(r)).id, progressQuerySchema.parse(r.query)),
  );
  app.get('/progress/weekly', async (r) =>
    s.weekly((await u(r)).id, progressQuerySchema.parse(r.query)),
  );
  app.get('/progress/prs', async (r) => {
    const user = await u(r),
      input = recordQuery.parse(r.query);
    return s.records(
      user.id,
      input,
      localeOf(r.headers['x-jimo-locale']),
      input.cursor,
      input.limit,
    );
  });
  app.get('/progress/exercises', async (r) =>
    s.exercises(
      (await u(r)).id,
      progressListQuerySchema.parse(r.query),
      localeOf(r.headers['x-jimo-locale']),
    ),
  );
  app.get('/progress/exercises/:id', async (r) =>
    s.exercise(
      (await u(r)).id,
      params.parse(r.params).id,
      progressQuerySchema.parse(r.query),
      localeOf(r.headers['x-jimo-locale']),
    ),
  );
  app.get('/progress/workouts/:id/records', async (r) => {
    const user = await u(r);
    z.object({}).strict().parse(r.query);
    return s.workoutRecords(
      user.id,
      params.parse(r.params).id,
      localeOf(r.headers['x-jimo-locale']),
    );
  });
}
