import {
  programListSchema,
  programDetailSchema,
  type ProgramInput,
  type DayInput,
  type Prescription,
} from '@jimo/schemas';
import { apiRequest } from './client';
export const programsApi = {
  list: (locale: string, signal?: AbortSignal) =>
    apiRequest('/programs', programListSchema, {
      locale,
      ...(signal ? { signal } : {}),
    }),
  detail: (id: string, locale: string, signal?: AbortSignal) =>
    apiRequest(`/programs/${id}`, programDetailSchema, {
      locale,
      ...(signal ? { signal } : {}),
    }),
  create: (body: ProgramInput, locale: string) =>
    apiRequest('/programs', programDetailSchema, {
      method: 'POST',
      body,
      locale,
    }),
  update: (id: string, body: ProgramInput, locale: string) =>
    apiRequest(`/programs/${id}`, programDetailSchema, {
      method: 'PATCH',
      body,
      locale,
    }),
  activate: (id: string, locale: string) =>
    apiRequest(`/programs/${id}/activate`, programDetailSchema, {
      method: 'POST',
      locale,
    }),
  archive: (id: string, locale: string) =>
    apiRequest(`/programs/${id}/archive`, programDetailSchema, {
      method: 'POST',
      locale,
    }),
  saveDay: (
    id: string,
    dayId: string | undefined,
    body: DayInput,
    locale: string,
  ) =>
    apiRequest(
      dayId ? `/program-days/${dayId}` : `/programs/${id}/days`,
      programDetailSchema,
      { method: dayId ? 'PATCH' : 'POST', body, locale },
    ),
  removeDay: (dayId: string, locale: string) =>
    apiRequest(`/program-days/${dayId}`, programDetailSchema, {
      method: 'DELETE',
      locale,
    }),
  reorderDays: (id: string, ids: string[], locale: string) =>
    apiRequest(`/programs/${id}/days/reorder`, programDetailSchema, {
      method: 'POST',
      body: { ids },
      locale,
    }),
  saveExercise: (
    dayId: string,
    prescriptionId: string | undefined,
    body: Prescription,
    locale: string,
  ) =>
    apiRequest(
      prescriptionId
        ? `/program-exercises/${prescriptionId}`
        : `/program-days/${dayId}/exercises`,
      programDetailSchema,
      { method: prescriptionId ? 'PATCH' : 'POST', body, locale },
    ),
  removeExercise: (id: string, locale: string) =>
    apiRequest(`/program-exercises/${id}`, programDetailSchema, {
      method: 'DELETE',
      locale,
    }),
  reorderExercises: (dayId: string, ids: string[], locale: string) =>
    apiRequest(
      `/program-days/${dayId}/exercises/reorder`,
      programDetailSchema,
      { method: 'POST', body: { ids }, locale },
    ),
};
