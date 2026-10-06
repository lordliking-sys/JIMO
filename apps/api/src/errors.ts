import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import { safeDatabaseError } from '@jimo/database';
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}
export function installErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ApiError)
      return reply
        .code(error.status)
        .send({ error: { code: error.code, message: error.message } });
    if (
      error instanceof z.ZodError ||
      (typeof error === 'object' &&
        error !== null &&
        'statusCode' in error &&
        error.statusCode === 400)
    )
      return reply.code(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid request' },
      });
    const safe = safeDatabaseError(error);
    app.log.error({ event: 'request_failed', ...safe }, 'Request failed');
    if (safe.code === '23505')
      return reply.code(409).send({
        error: {
          code: 'CONFLICT',
          message: 'Resource already exists or has changed',
        },
      });
    return reply.code(500).send({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Request could not be completed',
      },
    });
  });
  app.setNotFoundHandler((_request, reply) =>
    reply
      .code(404)
      .send({ error: { code: 'NOT_FOUND', message: 'Route not found' } }),
  );
}
