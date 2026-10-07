import {
  scheduledDayCompleted,
  calendarWeekStart,
  zonedDateKey,
  actualFor,
  type ActualInput,
  type WorkoutExercise,
  type WorkoutSet,
  type WorkoutDetail,
  type WorkoutSummary,
  type DayDto,
} from '@jimo/schemas';
import { weekdayNumbers } from '../programs/weekdays';
import {
  decimalDisplay,
  decimalInput,
  integerInput,
} from '../programs/helpers';
export type ActualDraft = {
  reps: string;
  duration: string;
  load: string;
  assistance: string;
  rpe: string;
};
export function prefillDraft(
  exercise: WorkoutExercise,
  set: WorkoutSet,
  locale: string,
): ActualDraft {
  const actual = set.status === 'completed';
  return {
    reps:
      exercise.trackingModeSnapshot === 'reps'
        ? String(
            (actual ? set.actualReps : (set.targetReps ?? set.targetRepMin)) ??
              '',
          )
        : '',
    duration:
      exercise.trackingModeSnapshot === 'duration'
        ? String(
            (actual ? set.actualDurationSeconds : set.targetDurationSeconds) ??
              '',
          )
        : '',
    load: decimalDisplay(actual ? set.actualLoadKg : set.targetLoadKg, locale),
    assistance: decimalDisplay(
      actual ? set.actualAssistanceKg : set.targetAssistanceKg,
      locale,
    ),
    rpe: decimalDisplay(actual ? set.actualRpe : set.targetRpe, locale),
  };
}
export function actualPayload(
  exercise: WorkoutExercise,
  draft: ActualDraft,
): ActualInput {
  return actualFor(exercise).parse({
    actualReps:
      exercise.trackingModeSnapshot === 'reps'
        ? integerInput(draft.reps)
        : null,
    actualDurationSeconds:
      exercise.trackingModeSnapshot === 'duration'
        ? integerInput(draft.duration)
        : null,
    actualLoadKg: ['weighted', 'external'].includes(exercise.loadModeSnapshot)
      ? decimalInput(draft.load, 2)
      : null,
    actualAssistanceKg:
      exercise.loadModeSnapshot === 'assisted'
        ? decimalInput(draft.assistance, 2)
        : null,
    actualRpe: draft.rpe.trim() ? decimalInput(draft.rpe, 1) : null,
  });
}
export function nextPending(workout: WorkoutDetail) {
  for (
    let exerciseIndex = 0;
    exerciseIndex < workout.exercises.length;
    exerciseIndex++
  ) {
    const exercise = workout.exercises[exerciseIndex]!;
    const set = exercise.sets.find((s) => s.status === 'pending');
    if (set) return { exercise, set, exerciseIndex };
  }
  return null;
}
export function latestCompleted(workout: WorkoutDetail) {
  return (
    workout.exercises
      .flatMap((exercise) =>
        exercise.sets
          .filter((set) => set.status === 'completed' && set.completedAt)
          .map((set) => ({ exercise, set })),
      )
      .sort(
        (a, b) =>
          Date.parse(b.set.completedAt!) - Date.parse(a.set.completedAt!),
      )[0] ?? null
  );
}
export function restRemaining(
  completedAt: string | null,
  restSeconds: number | null,
  now = Date.now(),
): number {
  if (!completedAt || !restSeconds) return 0;
  return Math.max(
    0,
    Math.ceil((Date.parse(completedAt) + restSeconds * 1000 - now) / 1000),
  );
}
export function recoverRest(
  workout: WorkoutDetail,
  now = Date.now(),
  skippedRestId: string | null = null,
) {
  const next = nextPending(workout),
    last = latestCompleted(workout);
  // No rest after the last set of an exercise: move directly to the next.
  if (
    workout.status !== 'in_progress' ||
    !next ||
    !last ||
    last.exercise.id !== next.exercise.id ||
    last.set.id === skippedRestId
  )
    return null;
  const remaining = restRemaining(
    last.set.completedAt,
    last.exercise.restSecondsSnapshot,
    now,
  );
  return remaining > 0 ? { ...last, remaining } : null;
}
export const countdown = (seconds: number) =>
  `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
export function sessionSeconds(
  session: Pick<WorkoutSummary, 'startedAt' | 'completedAt'>,
  now = Date.now(),
) {
  return Math.max(
    0,
    Math.floor(
      ((session.completedAt ? Date.parse(session.completedAt) : now) -
        Date.parse(session.startedAt)) /
        1000,
    ),
  );
}
export function weekBounds(now: Date) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return { start, end };
}
export function localWeekday(date: Date) {
  return ((date.getDay() + 6) % 7) + 1;
}
export function weekSchedule(
  days: DayDto[],
  history: WorkoutSummary[],
  programId: string,
  now: Date,
) {
  const { start } = weekBounds(now);
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const weekStart = calendarWeekStart(zonedDateKey(now, timeZone));
  return weekdayNumbers.map((weekday) => {
    const date = new Date(start);
    date.setDate(date.getDate() + weekday - 1);
    return {
      weekday,
      date,
      today: localWeekday(now) === weekday,
      days: days.filter((d) => d.dayOfWeek === weekday),
      completed: days
        .filter((d) => d.dayOfWeek === weekday)
        .some((day) =>
          scheduledDayCompleted(day, history, programId, weekStart, timeZone),
        ),
    };
  });
}
export function setSummary(
  exercise: WorkoutExercise,
  set: WorkoutSet,
  locale: string,
  actual = false,
) {
  const reps = actual ? set.actualReps : set.targetReps,
    duration = actual ? set.actualDurationSeconds : set.targetDurationSeconds;
  const target =
    exercise.trackingModeSnapshot === 'duration'
      ? `${duration ?? '—'} s`
      : reps !== null
        ? String(reps)
        : set.targetRepMin !== null
          ? `${set.targetRepMin}–${set.targetRepMax}`
          : '—';
  const load = actual ? set.actualLoadKg : set.targetLoadKg,
    assistance = actual ? set.actualAssistanceKg : set.targetAssistanceKg,
    rpe = actual ? set.actualRpe : set.targetRpe;
  return {
    target,
    load: decimalDisplay(
      exercise.loadModeSnapshot === 'assisted' ? assistance : load,
      locale,
    ),
    rpe: decimalDisplay(rpe, locale),
  };
}
export function actualDiffers(set: WorkoutSet) {
  return (
    set.status === 'completed' &&
    ((set.targetReps !== null && set.actualReps !== set.targetReps) ||
      (set.targetRepMin !== null &&
        (set.actualReps! < set.targetRepMin ||
          set.actualReps! > set.targetRepMax!)) ||
      set.targetDurationSeconds !== set.actualDurationSeconds ||
      set.targetLoadKg !== set.actualLoadKg ||
      set.targetAssistanceKg !== set.actualAssistanceKg ||
      set.targetRpe !== set.actualRpe)
  );
}
