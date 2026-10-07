import {
  activeWorkoutSchema,
  workoutDetailSchema,
  workoutHistorySchema,
  type ActualInput,
} from '@jimo/schemas';
import { apiRequest } from './client';
export const workoutsApi = {
  active: (signal?: AbortSignal) =>
    apiRequest(
      '/workouts/active',
      activeWorkoutSchema,
      signal ? { signal } : {},
    ),
  detail: (id: string, signal?: AbortSignal) =>
    apiRequest(
      `/workouts/${id}`,
      workoutDetailSchema,
      signal ? { signal } : {},
    ),
  history: (since?: string, until?: string, signal?: AbortSignal) =>
    apiRequest(
      `/workouts?limit=100${since ? `&since=${encodeURIComponent(since)}` : ''}${until ? `&until=${encodeURIComponent(until)}` : ''}`,
      workoutHistorySchema,
      signal ? { signal } : {},
    ),
  start: (programDayId: string, locale: string) =>
    apiRequest('/workouts/start', workoutDetailSchema, {
      method: 'POST',
      body: { programDayId },
      locale,
    }),
  save: (id: string, body: ActualInput, correction = false) =>
    apiRequest(
      correction ? `/workout-sets/${id}` : `/workout-sets/${id}/complete`,
      workoutDetailSchema,
      { method: correction ? 'PATCH' : 'POST', body },
    ),
  skip: (id: string) =>
    apiRequest(`/workout-sets/${id}/skip`, workoutDetailSchema, {
      method: 'POST',
    }),
  finish: (id: string, skipPending = false) =>
    apiRequest(`/workouts/${id}/complete`, workoutDetailSchema, {
      method: 'POST',
      body: { skipPending },
    }),
  cancel: (id: string) =>
    apiRequest(`/workouts/${id}/cancel`, workoutDetailSchema, {
      method: 'POST',
    }),
};
