import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { profileUpdateSchema } from '@jimo/schemas';
import type { CurrentUserProvider } from '../current-user';
import type { ProfileService } from '../profile-service';
export const meRoutes: FastifyPluginAsync<{
  service: ProfileService;
  currentUser: CurrentUserProvider;
}> = async (app, options) => {
  app.get('/me', async (request) => {
    const user = await options.currentUser(request);
    z.strictObject({}).parse(request.query);
    return options.service.get(user.id);
  });
  app.patch('/me', async (request) => {
    const user = await options.currentUser(request);
    z.strictObject({}).parse(request.query);
    return options.service.update(
      user.id,
      profileUpdateSchema.parse(request.body),
    );
  });
};
