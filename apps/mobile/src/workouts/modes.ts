import type { WorkoutExercise } from '@jimo/schemas';
/** Derived from a persisted timestamp; ticks only request a redraw. */
export function emomClock(exercise: WorkoutExercise, now = Date.now()) {
  const interval = exercise.emomIntervalSecondsSnapshot ?? 60;
  const started = exercise.emomStartedAt
    ? Date.parse(exercise.emomStartedAt)
    : null;
  const elapsed = started === null ? 0 : Math.max(0, now - started);
  const index = Math.min(
    exercise.sets.length - 1,
    Math.floor(elapsed / (interval * 1000)),
  );
  const finished =
    started !== null && elapsed >= exercise.sets.length * interval * 1000;
  const remaining = finished
    ? 0
    : Math.max(0, Math.ceil(((index + 1) * interval * 1000 - elapsed) / 1000));
  return { index, remaining, finished, started: started !== null, interval };
}
