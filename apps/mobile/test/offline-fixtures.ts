import { randomUUID } from 'node:crypto';
import type { ProgramDetail } from '@jimo/schemas';
export function cachedProgram(): ProgramDetail {
  const time = '2026-10-06T08:00:00.000Z',
    audit = { createdAt: time, updatedAt: time };
  const exerciseId = randomUUID();
  return {
    id: randomUUID(),
    name: 'FORZA',
    status: 'active',
    description: null,
    durationWeeks: 8,
    startsOn: null,
    daysCount: 1,
    ...audit,
    days: [
      {
        id: randomUUID(),
        name: 'PUSH',
        dayOfWeek: 1,
        position: 0,
        notes: null,
        ...audit,
        exercises: [
          {
            id: randomUUID(),
            exerciseId,
            position: 0,
            loadMode: 'external',
            targetSets: 3,
            targetReps: 8,
            targetRepMin: null,
            targetRepMax: null,
            targetDurationSeconds: null,
            targetLoadKg: '80.00',
            targetAssistanceKg: null,
            targetRpe: '8.0',
            restSeconds: 180,
            notes: null,
            ...audit,
            exercise: {
              id: exerciseId,
              displayName: 'Panca piana',
              canonicalName: 'Panca piana',
              trackingMode: 'reps',
              defaultLoadMode: 'external',
              isCustom: false,
            },
          },
        ],
      },
    ],
  };
}
