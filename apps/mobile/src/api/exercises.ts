import {
  exerciseDtoSchema,
  exerciseListSchema,
  type trackingModes,
  customExerciseInputSchema,
} from '@jimo/schemas';
import type { z } from 'zod';
import { apiRequest } from './client';
export const exercisesApi = {
  list: (
    locale: string,
    search: string,
    cursor: string | null,
    signal?: AbortSignal,
    trackingMode?: (typeof trackingModes)[number],
  ) => {
    const query = new URLSearchParams({ search, limit: '30' });
    if (cursor) query.set('cursor', cursor);
    if (trackingMode) query.set('trackingMode', trackingMode);
    return apiRequest(`/exercises?${query}`, exerciseListSchema, {
      locale,
      ...(signal ? { signal } : {}),
    });
  },
  get: (id: string, locale: string, signal?: AbortSignal) =>
    apiRequest(`/exercises/${id}`, exerciseDtoSchema, {
      locale,
      ...(signal ? { signal } : {}),
    }),
  create: (body: z.infer<typeof customExerciseInputSchema>, locale: string) =>
    apiRequest('/exercises', exerciseDtoSchema, {
      method: 'POST',
      body,
      locale,
    }),
};
