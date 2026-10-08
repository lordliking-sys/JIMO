import {
  calendarWeekStart,
  zonedDateKey,
  type DayDto,
  type ProgramDetail,
  type WorkoutDetail,
  type WorkoutSummary,
} from '@jimo/schemas';
import { parseCalendarDate } from '../programs/date';
import { localWeekday, weekBounds } from '../workouts/helpers';

export type DayState = 'completed' | 'current' | 'future';
export function dayArtworkKey(
  name: string,
): 'push' | 'pull' | 'legs' | 'full' | null {
  const words = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  if (/\b(full[\s-]*body|full|total[\s-]*body)\b/.test(words)) return 'full';
  if (/\b(push|spinta)\b/.test(words)) return 'push';
  if (/\b(pull|tirata)\b/.test(words)) return 'pull';
  if (/\b(legs?|gambe|lower[\s-]*body)\b/.test(words)) return 'legs';
  return null;
}
export function completedExerciseCount(workout: WorkoutDetail) {
  return workout.exercises.filter(
    (exercise) =>
      exercise.sets.length &&
      exercise.sets.every((set) => set.status !== 'pending') &&
      exercise.sets.some((set) => set.status === 'completed'),
  ).length;
}
export function completedDay(
  day: DayDto,
  programId: string,
  history: WorkoutSummary[],
  weekStart: Date,
  timeZone: string,
) {
  const key = calendarWeekStart(zonedDateKey(weekStart, timeZone));
  return history.some(
    (session) =>
      session.status === 'completed' &&
      session.programId === programId &&
      session.programDayId === day.id &&
      session.completedAt &&
      calendarWeekStart(zonedDateKey(session.completedAt, timeZone)) === key,
  );
}
export function homeDay(
  program: ProgramDetail | null | undefined,
  now: Date,
  completedIds: Set<string>,
) {
  if (!program?.days.length) return { day: null, scheduledToday: false };
  const today = localWeekday(now),
    scheduled = program.days.filter((day) => day.dayOfWeek === today);
  const candidates = scheduled.length
    ? scheduled
    : [...program.days].sort((a, b) => {
        const distance = (day: DayDto) =>
          day.dayOfWeek === null ? 7 : (day.dayOfWeek - today + 7) % 7;
        return distance(a) - distance(b) || a.position - b.position;
      });
  return {
    day: candidates.find((day) => !completedIds.has(day.id)) ?? candidates[0]!,
    scheduledToday: scheduled.length > 0,
  };
}
/** Calendar-week offsets use date keys rather than elapsed local hours (DST). */
export function programWeek(
  program: ProgramDetail | null | undefined,
  now: Date,
) {
  const start = program?.startsOn ? parseCalendarDate(program.startsOn) : null;
  if (!start || !program?.durationWeeks)
    return { current: 1, total: 1, anchored: false };
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const origin = calendarWeekStart(program.startsOn!),
    today = calendarWeekStart(zonedDateKey(now, timeZone));
  const current =
    Math.floor(
      (Date.parse(`${today}T12:00:00Z`) - Date.parse(`${origin}T12:00:00Z`)) /
        (7 * 86400000),
    ) + 1;
  return {
    current: Math.max(1, Math.min(program.durationWeeks, current)),
    total: program.durationWeeks,
    anchored: true,
  };
}
export function selectedWeekBounds(
  program: ProgramDetail | null | undefined,
  week: number,
  now: Date,
) {
  const start =
    program?.startsOn && program.durationWeeks
      ? parseCalendarDate(program.startsOn)
      : null;
  const bounds = weekBounds(start ?? now);
  if (start) {
    bounds.start.setDate(bounds.start.getDate() + (week - 1) * 7);
    bounds.end.setDate(bounds.end.getDate() + (week - 1) * 7);
  }
  return bounds;
}
export function dayStates(
  program: ProgramDetail,
  history: WorkoutSummary[],
  active: WorkoutDetail | null | undefined,
  start: Date,
  currentWeek: boolean,
  now: Date,
) {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const done = new Set(
    program.days
      .filter((day) => completedDay(day, program.id, history, start, timeZone))
      .map((day) => day.id),
  );
  const ongoing = program.days.find(
    (day) => day.id === active?.programDayId && active.programId === program.id,
  );
  const current =
    currentWeek && program.status === 'active'
      ? (program.days.find(
          (day) =>
            day.id === active?.programDayId && active.programId === program.id,
        ) ?? homeDay(program, now, done).day)
      : null;
  return new Map(
    program.days.map(
      (day) =>
        [
          day.id,
          currentWeek && ongoing?.id === day.id
            ? 'current'
            : done.has(day.id)
              ? 'completed'
              : day.id === current?.id
                ? 'current'
                : 'future',
        ] as const,
    ),
  );
}
