import { randomUUID } from 'node:crypto';
import type { Page } from '@playwright/test';
import {
  customExerciseInputSchema,
  programInputSchema,
  dayInputSchema,
  prescriptionFor,
} from '@jimo/schemas';
import type { ProgramDetail, ExerciseDto, Prescription } from '@jimo/schemas';

/** An isolated HTTP-contract fixture. No request reaches Neon or an actual API. */
export async function builderFixture(page: Page) {
  await page.addInitScript(() =>
    localStorage.setItem(
      'jimo.preferences.v1',
      JSON.stringify({
        version: 1,
        onboardingCompleted: true,
        localePreference: 'it',
        onboarding: {
          locale: 'it',
          goal: 'strength',
          experienceLevel: 'intermediate',
          trainingDaysPerWeek: 4,
          equipment: ['fullGym'],
          startMethod: 'manual',
        },
      }),
    ),
  );
  const audit = {
    createdAt: '2026-10-06T08:00:00Z',
    updatedAt: '2026-10-06T08:00:00Z',
  };
  const catalog: ExerciseDto[] = [
    'Panca piana',
    'Dip',
    'Trazioni',
    'Rematore con bilanciere',
    'Push-Up',
    'Plank',
  ].map((name) => ({
    id: randomUUID(),
    displayName: name,
    canonicalName: name,
    trackingMode: name === 'Plank' ? 'duration' : 'reps',
    defaultLoadMode:
      name === 'Panca piana' || name === 'Rematore con bilanciere'
        ? 'external'
        : 'bodyweight',
    isCustom: false,
  }));
  let program: ProgramDetail | null = null;
  const writes: { method: string; path: string; body: unknown }[] = [];
  await page.route('http://localhost:4301/**', async (route) => {
    const url = new URL(route.request().url()),
      path = url.pathname,
      method = route.request().method();
    const headers = {
      'access-control-allow-origin': '*',
      'access-control-allow-headers': '*',
      'access-control-allow-methods': '*',
    };
    if (method === 'OPTIONS') return route.fulfill({ status: 204, headers });
    const reply = (json: unknown) => route.fulfill({ json, headers });
    const body = route.request().postData()
      ? route.request().postDataJSON()
      : null;
    if (method !== 'GET') writes.push({ method, path, body });
    if (path === '/exercises' && method === 'POST') {
      const input = customExerciseInputSchema.parse(body);
      const custom: ExerciseDto = {
        id: randomUUID(),
        displayName: input.name,
        canonicalName: input.name,
        trackingMode: input.trackingMode,
        defaultLoadMode: input.defaultLoadMode ?? null,
        isCustom: true,
      };
      catalog.push(custom);
      return reply(custom);
    }
    if (path === '/exercises' && method === 'GET') {
      const search = (url.searchParams.get('search') ?? '').toLowerCase();
      return reply({
        exercises: catalog.filter((e) =>
          e.displayName.toLowerCase().includes(search),
        ),
        nextCursor: null,
      });
    }
    const exercise = catalog.find((e) => path === `/exercises/${e.id}`);
    if (exercise) return reply(exercise);
    if (path === '/sync/identity')
      return reply({ userId: '3c9e1b7d-7596-4f15-a11c-48b8ef237413' });
    if (path === '/workouts/active') return reply({ workout: null });
    if (path === '/workouts') return reply({ workouts: [] });
    if (path === '/programs' && method === 'GET')
      return reply({ programs: program ? [program] : [] });
    if (path === '/programs' && method === 'POST') {
      const input = programInputSchema.parse(body);
      program = {
        id: randomUUID(),
        name: input.name,
        description: input.description ?? null,
        status: 'draft',
        durationWeeks: input.durationWeeks ?? null,
        startsOn: input.startsOn ?? null,
        daysCount: 0,
        days: [],
        ...audit,
      };
      return reply(program);
    }
    if (!program)
      return route.fulfill({
        status: 404,
        json: { error: { code: 'NOT_FOUND', message: 'Fixture not found' } },
        headers,
      });
    if (path === `/programs/${program.id}` && method === 'GET')
      return reply(program);
    if (path === `/programs/${program.id}` && method === 'PATCH') {
      const input = programInputSchema.parse(body);
      program = {
        ...program,
        name: input.name,
        description: input.description ?? null,
        durationWeeks: input.durationWeeks ?? null,
        startsOn: input.startsOn ?? null,
      };
      return reply(program);
    }
    if (path === `/programs/${program.id}/activate`) {
      program.status = 'active';
      return reply(program);
    }
    if (path === `/programs/${program.id}/archive`) {
      program.status = 'archived';
      return reply(program);
    }
    if (path === `/programs/${program.id}/days` && method === 'POST') {
      const input = dayInputSchema.parse(body);
      program.days.push({
        id: randomUUID(),
        name: input.name,
        dayOfWeek: input.dayOfWeek ?? null,
        notes: input.notes ?? null,
        position: program.days.length,
        exercises: [],
        ...audit,
      });
      program.daysCount = program.days.length;
      return reply(program);
    }
    if (path === `/programs/${program.id}/days/reorder`) {
      const order = (body as { ids: string[] }).ids;
      program.days = order.map((id, index) => ({
        ...program!.days.find((day) => day.id === id)!,
        position: index,
      }));
      return reply(program);
    }
    for (const day of program.days) {
      if (path === `/program-days/${day.id}` && method === 'PATCH') {
        const input = dayInputSchema.parse(body);
        Object.assign(day, input);
        return reply(program);
      }
      if (path === `/program-days/${day.id}` && method === 'DELETE') {
        program.days = program.days
          .filter((d) => d !== day)
          .map((d, position) => ({ ...d, position }));
        program.daysCount = program.days.length;
        return reply(program);
      }
      if (path === `/program-days/${day.id}/exercises/reorder`) {
        const order = (body as { ids: string[] }).ids;
        day.exercises = order.map((id, position) => ({
          ...day.exercises.find((e) => e.id === id)!,
          position,
        }));
        return reply(program);
      }
      const current = day.exercises.find(
        (e) => path === `/program-exercises/${e.id}`,
      );
      if (current && method === 'DELETE') {
        day.exercises = day.exercises
          .filter((e) => e !== current)
          .map((e, position) => ({ ...e, position }));
        return reply(program);
      }
      if (
        (path === `/program-days/${day.id}/exercises` && method === 'POST') ||
        (current && method === 'PATCH')
      ) {
        const input = body as Prescription,
          exercise = catalog.find((e) => e.id === input.exerciseId)!;
        const valid = prescriptionFor(exercise.trackingMode).parse(input);
        if (current) Object.assign(current, valid);
        else
          day.exercises.push({
            ...valid,
            id: randomUUID(),
            position: day.exercises.length,
            exercise,
            ...audit,
          });
        return reply(program);
      }
    }
    return route.fulfill({
      status: 404,
      json: {
        error: { code: 'NOT_FOUND', message: 'Unexpected fixture request' },
      },
      headers,
    });
  });
  return {
    get program() {
      return program!;
    },
    writes,
    catalog,
  };
}
