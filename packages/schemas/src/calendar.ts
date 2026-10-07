/** Calendar keys in the user's zone, never UTC date slicing on a workout timestamp. */
export function zonedDateKey(value: string | Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(value));
  return `${parts.find((p) => p.type === 'year')!.value}-${parts.find((p) => p.type === 'month')!.value}-${parts.find((p) => p.type === 'day')!.value}`;
}
export function calendarWeekStart(dateKey: string) {
  const date = new Date(`${dateKey}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return date.toISOString().slice(0, 10);
}
export function calendarWeekday(dateKey: string) {
  return ((new Date(`${dateKey}T12:00:00Z`).getUTCDay() + 6) % 7) + 1;
}
export function scheduledDayCompleted(
  day: { id: string; dayOfWeek: number | null },
  sessions: {
    status: string;
    programId: string | null;
    programDayId: string | null;
    completedAt: string | null;
  }[],
  programId: string,
  weekStart: string,
  timeZone: string,
) {
  return (
    day.dayOfWeek !== null &&
    sessions.some((s) => {
      if (
        s.status !== 'completed' ||
        s.programId !== programId ||
        s.programDayId !== day.id ||
        !s.completedAt
      )
        return false;
      const key = zonedDateKey(s.completedAt, timeZone);
      return (
        calendarWeekStart(key) === weekStart &&
        calendarWeekday(key) === day.dayOfWeek
      );
    })
  );
}
export function currentWeekAdherence(
  days: { id: string; dayOfWeek: number | null }[],
  sessions: Parameters<typeof scheduledDayCompleted>[1],
  programId: string,
  now: Date,
  timeZone: string,
) {
  if (!days.length || days.some((d) => d.dayOfWeek === null)) return null;
  const weekStart = calendarWeekStart(zonedDateKey(now, timeZone));
  const completed = days.filter((d) =>
    scheduledDayCompleted(d, sessions, programId, weekStart, timeZone),
  ).length;
  return {
    weekStart,
    planned: days.length,
    completed,
    percentage: (completed / days.length) * 100,
  };
}
