import type { ExerciseModeMetrics } from '@jimo/schemas';
export type SessionPoint = ExerciseModeMetrics['timeline'][number];
export function performanceLanes(mode: ExerciseModeMetrics) {
  const lanes: {
    key: 'maxLoadKg' | 'minAssistanceKg' | 'maxReps' | 'maxDurationSeconds';
    label:
      | 'loadProgress'
      | 'assistanceProgress'
      | 'repsProgress'
      | 'durationProgress';
    unit: string;
  }[] = [];
  if (mode.loadMode !== 'bodyweight')
    lanes.push({
      key: mode.loadMode === 'assisted' ? 'minAssistanceKg' : 'maxLoadKg',
      label:
        mode.loadMode === 'assisted' ? 'assistanceProgress' : 'loadProgress',
      unit: 'kg',
    });
  lanes.push(
    mode.trackingMode === 'reps'
      ? { key: 'maxReps', label: 'repsProgress', unit: 'reps' }
      : { key: 'maxDurationSeconds', label: 'durationProgress', unit: 's' },
  );
  return lanes;
}
export function observation(
  point: SessionPoint,
  key: ReturnType<typeof performanceLanes>[number]['key'],
) {
  const value = point[key];
  return value === null
    ? null
    : Number.isFinite(Number(value))
      ? Number(value)
      : null;
}
/** A padded, explicitly labelled scale. Missing observations never become zero. */
export function performanceScale(values: (number | null)[], integer: boolean) {
  const valid = values.filter(
    (v): v is number => v !== null && Number.isFinite(v),
  );
  if (!valid.length) return null;
  const min = Math.min(...valid),
    max = Math.max(...valid),
    span = Math.max(max - min, max * 0.08, integer ? 2 : 1);
  const raw = (span * 1.3) / 3,
    power = 10 ** Math.floor(Math.log10(raw));
  const rounded =
    ([1, 2, 2.5, 5, 10].find((n) => n * power >= raw) ?? 10) * power;
  const step = integer
    ? Math.max(1, Math.ceil(rounded))
    : Math.max(0.1, rounded);
  const low = Math.max(0, Math.floor((min - span * 0.15) / step) * step),
    high = Math.max(low + step, Math.ceil((max + span * 0.15) / step) * step);
  const ticks = Array.from(
    { length: Math.round((high - low) / step) + 1 },
    (_, i) => low + i * step,
  );
  return { low, high, ticks };
}
export function chronologicalSessions(points: SessionPoint[]) {
  return [...points].sort(
    (a, b) =>
      Date.parse(a.date) - Date.parse(b.date) ||
      a.sessionId.localeCompare(b.sessionId),
  );
}
export function observedSegments(values: (number | null)[]) {
  const segments: { index: number; value: number }[][] = [];
  values.forEach((value, index) => {
    if (value === null) return;
    if (!index || values[index - 1] === null) segments.push([]);
    segments.at(-1)!.push({ index, value });
  });
  return segments;
}
