import { randomUUID } from 'node:crypto';
import type { Page } from '@playwright/test';
import {
  actualFor,
  workoutOperationSchema,
  type WorkoutDetail,
  type WorkoutSet,
  type ActualInput,
  type ProgramDetail,
} from '@jimo/schemas';
export async function workoutFixture(page: Page, locale = 'it') {
  await page.addInitScript(
    (language) =>
      localStorage.setItem(
        'jimo.preferences.v1',
        JSON.stringify({
          version: 1,
          onboardingCompleted: true,
          localePreference: language,
          onboarding: {
            locale: language,
            goal: 'strength',
            experienceLevel: 'intermediate',
            trainingDaysPerWeek: 3,
            equipment: ['fullGym'],
            startMethod: 'manual',
          },
        }),
      ),
    locale,
  );
  const audit = {
    createdAt: '2026-10-06T08:00:00Z',
    updatedAt: '2026-10-06T08:00:00Z',
  };
  const programId = randomUUID(),
    dayId = randomUUID();
  const workout: WorkoutDetail = {
    id: randomUUID(),
    programId,
    programDayId: dayId,
    name: 'PUSH',
    status: 'in_progress',
    startedAt: '2026-10-06T10:00:00Z',
    completedAt: null,
    notes: null,
    exercisesCount: 5,
    completedSets: 0,
    skippedSets: 0,
    pendingSets: 6,
    ...audit,
    exercises: [
      'Panca piana',
      'Trazioni',
      'Push-Up',
      'Trazioni assistite',
      'Plank',
    ].map((name, i) => ({
      id: randomUUID(),
      exerciseId: randomUUID(),
      programExerciseId: null,
      position: i,
      exerciseNameSnapshot: name,
      trackingModeSnapshot: i === 4 ? 'duration' : 'reps',
      loadModeSnapshot:
        i === 0
          ? 'external'
          : i === 1
            ? 'weighted'
            : i === 3
              ? 'assisted'
              : 'bodyweight',
      restSecondsSnapshot: 180,
      notes: null,
      ...audit,
      sets: Array.from(
        { length: i === 0 ? 2 : 1 },
        (_, n) =>
          ({
            id: randomUUID(),
            setNumber: n + 1,
            status: 'pending',
            targetReps: i === 4 ? null : 8,
            targetRepMin: null,
            targetRepMax: null,
            targetDurationSeconds: i === 4 ? 60 : null,
            targetLoadKg: i === 0 ? '80.00' : i === 1 ? '20.00' : null,
            targetAssistanceKg: i === 3 ? '15.00' : null,
            targetRpe: '8.0',
            actualReps: null,
            actualDurationSeconds: null,
            actualLoadKg: null,
            actualAssistanceKg: null,
            actualRpe: null,
            completedAt: null,
            ...audit,
          }) satisfies WorkoutSet,
      ),
    })),
  };
  const program: ProgramDetail = {
    id: programId,
    name: 'FORZA',
    description: null,
    status: 'active',
    durationWeeks: 8,
    startsOn: '2026-10-06',
    daysCount: 3,
    ...audit,
    days: [1, 3, 5].map((dayOfWeek, i) => ({
      id: i === 0 ? dayId : randomUUID(),
      name: ['PUSH', 'PULL', 'LEGS'][i]!,
      dayOfWeek,
      notes: null,
      position: i,
      ...audit,
      exercises:
        i === 0
          ? workout.exercises.map((e) => ({
              id: randomUUID(),
              position: e.position,
              exerciseId: e.exerciseId,
              loadMode: e.loadModeSnapshot,
              targetSets: e.sets.length,
              targetReps: e.sets[0]!.targetReps,
              targetRepMin: null,
              targetRepMax: null,
              targetDurationSeconds: e.sets[0]!.targetDurationSeconds,
              targetLoadKg: e.sets[0]!.targetLoadKg,
              targetAssistanceKg: e.sets[0]!.targetAssistanceKg,
              targetRpe: e.sets[0]!.targetRpe,
              restSeconds: 180,
              notes: null,
              exercise: {
                id: e.exerciseId,
                displayName: e.exerciseNameSnapshot,
                canonicalName: e.exerciseNameSnapshot,
                trackingMode: e.trackingModeSnapshot,
                defaultLoadMode: e.loadModeSnapshot,
                isCustom: false,
              },
              ...audit,
            }))
          : [],
    })),
  };
  let started = false,
    failNext = false;
  const acknowledged = new Set<string>();
  const writes: { path: string; body: unknown }[] = [];
  const refresh = () => {
    const sets = workout.exercises.flatMap((e) => e.sets);
    workout.completedSets = sets.filter((s) => s.status === 'completed').length;
    workout.skippedSets = sets.filter((s) => s.status === 'skipped').length;
    workout.pendingSets = sets.filter((s) => s.status === 'pending').length;
  };
  await page.route('http://localhost:4301/**', async (route) => {
    const path = new URL(route.request().url()).pathname,
      method = route.request().method(),
      body = route.request().postData() ? route.request().postDataJSON() : {};
    const headers = {
      'access-control-allow-origin': '*',
      'access-control-allow-headers': '*',
      'access-control-allow-methods': '*',
    };
    const reply = (json: unknown, status = 200) =>
      route.fulfill({ json, status, headers });
    if (method === 'OPTIONS') return route.fulfill({ status: 204, headers });
    if (path === '/sync/workout-operations') {
      if (failNext) {
        failNext = false;
        return reply(
          {
            error: {
              code: 'INTERNAL_ERROR',
              message: 'Fixture sync unavailable',
            },
          },
          500,
        );
      }
      const ack: string[] = [];
      for (const value of body.operations) {
        const op = workoutOperationSchema.parse(value);
        if (!acknowledged.has(op.operationId)) {
          writes.push({ path, body: op });
          if (op.operationType === 'START_WORKOUT') {
            started = true;
            const stamp = { createdAt: op.createdAt, updatedAt: op.createdAt };
            Object.assign(workout, {
              ...op.payload,
              id: op.sessionId,
              status: 'in_progress',
              startedAt: op.createdAt,
              completedAt: null,
              ...stamp,
              exercises: op.payload.exercises.map((e) => ({
                ...e,
                ...stamp,
                sets: e.sets.map((s) => ({
                  ...s,
                  status: 'pending',
                  completedAt: null,
                  ...stamp,
                  actualReps: null,
                  actualDurationSeconds: null,
                  actualLoadKg: null,
                  actualAssistanceKg: null,
                  actualRpe: null,
                })),
              })),
            });
          } else if (
            op.operationType === 'COMPLETE_SET' ||
            op.operationType === 'UPDATE_SET' ||
            op.operationType === 'SKIP_SET'
          ) {
            const e = workout.exercises.find((e) =>
                e.sets.some((s) => s.id === op.entityId),
              )!,
              s = e.sets.find((s) => s.id === op.entityId)!;
            if (op.operationType === 'SKIP_SET') s.status = 'skipped';
            else {
              Object.assign(s, actualFor(e).parse(op.payload));
              s.status = 'completed';
              if (op.operationType === 'COMPLETE_SET')
                s.completedAt = op.createdAt;
            }
          } else {
            for (const e of workout.exercises)
              for (const s of e.sets)
                if (s.status === 'pending') s.status = 'skipped';
            workout.status =
              op.operationType === 'CANCEL_WORKOUT' ? 'cancelled' : 'completed';
            workout.completedAt = op.createdAt;
          }
          refresh();
          acknowledged.add(op.operationId);
        }
        ack.push(op.operationId);
      }
      return reply({ acknowledged: ack, failed: [] });
    }
    if (path.startsWith('/progress/')) {
      const period = {
        range: new URL(route.request().url()).searchParams.get('range') ?? '8w',
        timeZone: 'UTC',
        from: '2026-08-01T00:00:00Z',
        to: new Date().toISOString(),
        effectiveWeeks: 8,
      };
      if (path === '/progress/summary')
        return reply({
          period,
          completedWorkouts: workout.status === 'completed' ? 1 : 0,
          completedSets:
            workout.status === 'completed' ? workout.completedSets : 0,
          skippedSets: workout.status === 'completed' ? workout.skippedSets : 0,
          totalReps: null,
          averageRpe: null,
          trainingSeconds: null,
          sessionsPerWeek: workout.status === 'completed' ? 0.125 : 0,
          adherence: null,
        });
      if (path === '/progress/weekly') return reply({ period, weeks: [] });
      if (path === '/progress/prs')
        return reply({ period, records: [], nextCursor: null });
      if (path === '/progress/exercises')
        return reply({ period, exercises: [], nextCursor: null });
      if (path.endsWith('/records'))
        return reply({ sessionId: workout.id, records: [] });
    }
    if (path === '/programs') return reply({ programs: [program] });
    if (path === `/programs/${programId}`) return reply(program);
    if (path === '/sync/identity')
      return reply({ userId: '3c9e1b7d-7596-4f15-a11c-48b8ef237413' });
    if (path === '/workouts/active')
      return reply({
        workout: started && workout.status === 'in_progress' ? workout : null,
      });
    if (path === '/workouts')
      return reply({
        workouts: workout.status === 'in_progress' ? [] : [workout],
      });
    if (method === 'GET' && path === `/workouts/${workout.id}`)
      return reply(workout);
    if (method !== 'GET') writes.push({ path, body });
    if (path === '/workouts/start') {
      started = true;
      return reply(workout, 201);
    }
    if (path.startsWith('/workout-sets/')) {
      if (failNext) {
        failNext = false;
        return reply(
          {
            error: { code: 'INTERNAL_ERROR', message: 'Fixture write failed' },
          },
          500,
        );
      }
      const id = path.split('/')[2],
        e = workout.exercises.find((e) => e.sets.some((s) => s.id === id))!,
        s = e.sets.find((s) => s.id === id)!;
      if (path.endsWith('/skip')) s.status = 'skipped';
      else {
        const actual = actualFor(e).parse(body as ActualInput);
        Object.assign(s, actual, {
          status: 'completed',
          completedAt: s.completedAt ?? new Date().toISOString(),
        });
      }
      refresh();
      return reply(workout);
    }
    if (path.endsWith('/complete') || path.endsWith('/cancel')) {
      for (const e of workout.exercises)
        for (const s of e.sets)
          if (s.status === 'pending') s.status = 'skipped';
      workout.status = path.endsWith('/cancel') ? 'cancelled' : 'completed';
      workout.completedAt = new Date().toISOString();
      refresh();
      return reply(workout);
    }
    return reply(
      { error: { code: 'NOT_FOUND', message: 'Fixture route missing' } },
      404,
    );
  });
  return {
    workout,
    program,
    writes,
    fail: () => {
      failNext = true;
    },
    setStarted: () => {
      started = true;
    },
  };
}
