import type { WorkoutExercise, WorkoutSet, ActualInput } from '@jimo/schemas';
export const EMOM_PREPARATION_SECONDS = 10;
/** emomStartedAt is the persisted round-one deadline; preparation never counts as training. */
export function emomClock(exercise: WorkoutExercise, now = Date.now()) {
  const interval = exercise.emomIntervalSecondsSnapshot ?? 60;
  const start = exercise.emomStartedAt
    ? Date.parse(exercise.emomStartedAt)
    : null;
  const preparing = start !== null && now < start;
  const elapsed = start === null ? 0 : Math.max(0, now - start);
  const completedRounds =
    start === null
      ? 0
      : Math.min(exercise.sets.length, Math.floor(elapsed / (interval * 1000)));
  const index = Math.max(
    0,
    Math.min(exercise.sets.length - 1, completedRounds),
  );
  const finished = start !== null && completedRounds === exercise.sets.length;
  const deadline =
    start === null
      ? null
      : preparing
        ? start
        : start + (index + 1) * interval * 1000;
  const remaining = finished
    ? 0
    : start === null
      ? interval
      : Math.min(
          preparing ? EMOM_PREPARATION_SECONDS : interval,
          Math.max(0, Math.ceil((deadline! - now) / 1000)),
        );
  return {
    index,
    remaining,
    finished,
    preparing,
    completedRounds,
    deadline,
    started: start !== null,
    interval,
  };
}
/** Explicit defaults for automatic completion. Snapshots remain immutable; summary corrections edit only actual fields. */
export function defaultEmomActual(set: WorkoutSet): ActualInput {
  return {
    actualReps: set.targetReps,
    actualDurationSeconds: null,
    actualLoadKg: set.targetLoadKg,
    actualAssistanceKg: set.targetAssistanceKg,
    actualRpe: set.targetRpe,
  };
}
