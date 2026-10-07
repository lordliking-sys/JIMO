import type {
  ExerciseModeMetrics,
  Performance,
  ProgressRecord,
} from '@jimo/schemas';
export function deviceTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}
export function formatNumber(
  value: number | null,
  locale: string,
  decimals = 1,
) {
  return value === null
    ? '—'
    : new Intl.NumberFormat(locale, { maximumFractionDigits: decimals }).format(
        value,
      );
}
export function formatKg(value: string | null, locale: string) {
  if (value === null) return '—';
  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) return '—';
  const number = Number(value);
  return Number.isFinite(number) ? formatNumber(number, locale, 2) : '—';
}
export function formatTrainingDuration(
  seconds: number | null,
  _locale: string,
) {
  if (seconds === null || !Number.isFinite(seconds) || seconds < 0) return '—';
  const minutes = Math.floor(seconds / 60),
    hours = Math.floor(minutes / 60),
    remaining = minutes % 60;
  return hours
    ? `${hours}h${remaining ? ` ${remaining}m` : ''}`
    : seconds > 0 && minutes === 0
      ? '<1 min'
      : `${minutes} min`;
}
export function formatHold(seconds: number | null) {
  if (seconds === null) return '—';
  const integer = Math.round(seconds);
  return `${Math.floor(integer / 60)}:${String(integer % 60).padStart(2, '0')}`;
}
export function performanceText(p: Performance, locale: string) {
  const value =
    p.trackingMode === 'duration'
      ? formatHold(p.durationSeconds)
      : `${p.reps ?? '—'} reps`;
  if (p.loadMode === 'bodyweight') return value;
  if (p.loadMode === 'assisted')
    return `${formatKg(p.assistanceKg, locale)} kg ${locale.startsWith('it') ? 'assistenza' : 'assistance'} × ${value}`;
  return `${p.loadMode === 'weighted' ? '+' : ''}${formatKg(p.loadKg, locale)} kg × ${value}`;
}
export function recordText(r: ProgressRecord, locale: string) {
  if (r.type === 'MAX_REPS')
    return `${formatNumber(Number(r.value), locale, 0)} reps`;
  if (r.type === 'MAX_DURATION') return formatHold(Number(r.value));
  const context =
    r.trackingMode === 'duration'
      ? formatHold(r.durationSeconds)
      : `${r.reps ?? '—'} reps`;
  return `${r.loadMode === 'weighted' ? '+' : ''}${formatKg(r.value, locale)} kg${r.type === 'MIN_ASSISTANCE' ? ` ${locale.startsWith('it') ? 'assistenza' : 'assistance'}` : ''} × ${context}`;
}
export function modeKey(
  mode: Pick<ExerciseModeMetrics, 'trackingMode' | 'loadMode'>,
) {
  return `${mode.trackingMode}:${mode.loadMode}`;
}
export function chartMetric(mode: ExerciseModeMetrics) {
  if (mode.trackingMode === 'duration')
    return {
      key: 'maxDurationSeconds' as const,
      unit: 'duration',
      lower: false,
    };
  if (mode.loadMode === 'bodyweight')
    return { key: 'maxReps' as const, unit: 'reps', lower: false };
  if (mode.loadMode === 'assisted')
    return { key: 'minAssistanceKg' as const, unit: 'kg', lower: true };
  return { key: 'maxLoadKg' as const, unit: 'kg', lower: false };
}
