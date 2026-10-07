import type { FastifyInstance } from 'fastify';
import multipart from '@fastify/multipart';
import { z } from 'zod';
import { importLimits, importConfirmationSchema } from '@jimo/schemas';
import type { CurrentUserProvider } from '../current-user';
import type { WorkoutPlanImportService } from '../ai/imports/workoutPlanImport';
import type { ImportConfirmationService } from '../ai/imports/confirmation';
import {
  validateImportFile,
  validateImportFiles,
  type ImportFile,
} from '../ai/imports/files';
import { ApiError } from '../errors';
export async function importRoutes(
  app: FastifyInstance,
  options: {
    enabled: boolean;
    service: WorkoutPlanImportService;
    confirmation: ImportConfirmationService;
    currentUser: CurrentUserProvider;
  },
) {
  await app.register(multipart, {
    limits: {
      files: 8,
      fields: 1,
      parts: 9,
      fileSize: importLimits.pdfBytes,
      fieldSize: 16,
    },
  });
  let active = 0;
  app.post(
    '/imports/workout-plan',
    { bodyLimit: importLimits.totalBytes + 65536 },
    async (r, reply) => {
      z.object({}).strict().parse(r.query);
      const user = await options.currentUser(r);
      if (!options.enabled)
        throw new ApiError(404, 'FEATURE_DISABLED', 'Feature unavailable');
      if (active >= 2)
        throw new ApiError(429, 'AI_RATE_LIMITED', 'Import service busy');
      active++;
      const files: ImportFile[] = [];
      let total = 0,
        locale: 'it' | 'en' | undefined;
      try {
        if (!r.isMultipart())
          throw new ApiError(
            400,
            'IMPORT_MULTIPART_INVALID',
            'Multipart upload required',
          );
        try {
          for await (const part of r.parts()) {
            if (part.type === 'field') {
              if (part.fieldname !== 'locale' || locale)
                throw new ApiError(
                  400,
                  'IMPORT_MULTIPART_INVALID',
                  'Unexpected field',
                );
              locale = z.enum(['it', 'en']).parse(part.value);
              continue;
            }
            if (!['file', 'files'].includes(part.fieldname))
              throw new ApiError(
                400,
                'IMPORT_MULTIPART_INVALID',
                'Unexpected file field',
              );
            const chunks: Buffer[] = [];
            let size = 0;
            for await (const chunk of part.file) {
              const data = Buffer.from(chunk);
              size += data.length;
              total += data.length;
              if (
                total > importLimits.totalBytes ||
                size >
                  (part.mimetype === 'application/pdf'
                    ? importLimits.pdfBytes
                    : importLimits.imageBytes)
              )
                throw new ApiError(
                  413,
                  'IMPORT_FILE_TOO_LARGE',
                  'File size limit',
                );
              chunks.push(data);
            }
            if (part.file.truncated)
              throw new ApiError(
                413,
                'IMPORT_FILE_TOO_LARGE',
                'File size limit',
              );
            files.push(
              await validateImportFile(
                part.mimetype,
                part.filename,
                Buffer.concat(chunks),
              ),
            );
          }
        } catch (error) {
          if (error instanceof ApiError || error instanceof z.ZodError)
            throw error;
          const code =
            error && typeof error === 'object' && 'code' in error
              ? String(error.code)
              : '';
          throw new ApiError(
            code === 'FST_REQ_FILE_TOO_LARGE' ? 413 : 400,
            code === 'FST_REQ_FILE_TOO_LARGE'
              ? 'IMPORT_FILE_TOO_LARGE'
              : ['FST_FILES_LIMIT', 'FST_PARTS_LIMIT'].includes(code)
                ? 'IMPORT_FILE_COUNT'
                : 'IMPORT_MULTIPART_INVALID',
            'Invalid multipart upload',
          );
        }
        if (!locale)
          throw new ApiError(
            400,
            'IMPORT_MULTIPART_INVALID',
            'Locale required',
          );
        validateImportFiles(files);
        r.log.info({
          event: 'workout_plan_import',
          files: files.map((f) => ({
            mime: f.mime,
            size: f.bytes.length,
            pages: f.pages,
          })),
        });
        return await options.service.extract(user.id, files, locale);
      } finally {
        active--;
        files.length = 0;
        reply.header('Cache-Control', 'no-store');
      }
    },
  );
  app.post(
    '/imports/workout-plan/confirm',
    { bodyLimit: 1024 * 1024 },
    async (r, reply) => {
      z.object({}).strict().parse(r.query);
      const user = await options.currentUser(r);
      if (!options.enabled)
        throw new ApiError(404, 'FEATURE_DISABLED', 'Feature unavailable');
      const locale = z
        .enum(['it', 'en'])
        .default('en')
        .parse(r.headers['x-jimo-locale']);
      return reply
        .code(201)
        .send(
          await options.confirmation.confirm(
            user.id,
            importConfirmationSchema.parse(r.body),
            locale,
          ),
        );
    },
  );
}
