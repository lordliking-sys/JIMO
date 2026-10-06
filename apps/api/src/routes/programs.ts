import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  programInputSchema,
  programPatchSchema,
  dayInputSchema,
  dayPatchSchema,
  prescriptionSchema,
  prescriptionPatchSchema,
  reorderSchema,
  customExerciseInputSchema,
  exerciseQuerySchema,
} from '@jimo/schemas';
import type { CurrentUserProvider } from '../current-user';
import type { ProgramService } from '../program-service';
const idParams = z.object({ id: z.uuid() });
export async function programRoutes(
  app: FastifyInstance,
  options: { service: ProgramService; currentUser: CurrentUserProvider },
) {
  const s = options.service,
    user = options.currentUser;
  const locale = (headers: Record<string, unknown>) =>
    z.enum(['it', 'en']).default('en').parse(headers['x-jimo-locale']);
  app.get('/exercises', async (r) =>
    s.listExercises(
      (await user(r)).id,
      locale(r.headers),
      exerciseQuerySchema.parse(r.query),
    ),
  );
  app.get('/exercises/:id', async (r) =>
    s.getExercise(
      (await user(r)).id,
      idParams.parse(r.params).id,
      locale(r.headers),
    ),
  );
  app.post('/exercises', async (r, reply) =>
    reply
      .code(201)
      .send(
        await s.createExercise(
          (await user(r)).id,
          customExerciseInputSchema.parse(r.body),
        ),
      ),
  );
  app.get('/programs', async (r) => s.list((await user(r)).id));
  app.post('/programs', async (r, reply) =>
    reply
      .code(201)
      .send(
        await s.create(
          (await user(r)).id,
          programInputSchema.parse(r.body),
          locale(r.headers),
        ),
      ),
  );
  app.get('/programs/:id', async (r) =>
    s.detail(
      (await user(r)).id,
      idParams.parse(r.params).id,
      locale(r.headers),
    ),
  );
  app.patch('/programs/:id', async (r) =>
    s.update(
      (await user(r)).id,
      idParams.parse(r.params).id,
      programPatchSchema.parse(r.body),
      locale(r.headers),
    ),
  );
  app.post('/programs/:id/activate', async (r) => {
    z.object({})
      .strict()
      .parse(r.body ?? {});
    return s.activate(
      (await user(r)).id,
      idParams.parse(r.params).id,
      locale(r.headers),
    );
  });
  app.post('/programs/:id/archive', async (r) => {
    z.object({})
      .strict()
      .parse(r.body ?? {});
    return s.archive(
      (await user(r)).id,
      idParams.parse(r.params).id,
      locale(r.headers),
    );
  });
  app.post('/programs/:id/days', async (r, reply) =>
    reply
      .code(201)
      .send(
        await s.addDay(
          (await user(r)).id,
          idParams.parse(r.params).id,
          dayInputSchema.parse(r.body),
          locale(r.headers),
        ),
      ),
  );
  app.post('/programs/:id/days/reorder', async (r) =>
    s.reorderDays(
      (await user(r)).id,
      idParams.parse(r.params).id,
      reorderSchema.parse(r.body).ids,
      locale(r.headers),
    ),
  );
  app.patch('/program-days/:id', async (r) =>
    s.updateDay(
      (await user(r)).id,
      idParams.parse(r.params).id,
      dayPatchSchema.parse(r.body),
      locale(r.headers),
    ),
  );
  app.delete('/program-days/:id', async (r) =>
    s.removeDay(
      (await user(r)).id,
      idParams.parse(r.params).id,
      locale(r.headers),
    ),
  );
  app.post('/program-days/:id/exercises', async (r, reply) =>
    reply
      .code(201)
      .send(
        await s.addPrescription(
          (await user(r)).id,
          idParams.parse(r.params).id,
          prescriptionSchema.parse(r.body),
          locale(r.headers),
        ),
      ),
  );
  app.post('/program-days/:id/exercises/reorder', async (r) =>
    s.reorderPrescriptions(
      (await user(r)).id,
      idParams.parse(r.params).id,
      reorderSchema.parse(r.body).ids,
      locale(r.headers),
    ),
  );
  app.patch('/program-exercises/:id', async (r) =>
    s.updatePrescription(
      (await user(r)).id,
      idParams.parse(r.params).id,
      prescriptionPatchSchema.parse(r.body),
      locale(r.headers),
    ),
  );
  app.delete('/program-exercises/:id', async (r) =>
    s.removePrescription(
      (await user(r)).id,
      idParams.parse(r.params).id,
      locale(r.headers),
    ),
  );
}
