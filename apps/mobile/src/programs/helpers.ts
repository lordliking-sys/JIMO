import { kg, rpe } from '@jimo/schemas';
export function decimalInput(value: string, scale: 1 | 2): string {
  const normalized = value.trim().replace(',', '.');
  return scale === 2 ? kg(normalized) : rpe(normalized);
}
export function decimalDisplay(
  value: string | null | undefined,
  locale: string,
): string {
  if (value == null) return '';
  const short = value.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
  return locale === 'it' ? short.replace('.', ',') : short;
}
export function stepDecimal(
  value: string,
  step: string,
  direction: 1 | -1,
  scale: 1 | 2,
): string {
  const toUnits = (input: string) => {
    const [whole = '0', fraction = ''] = input.split('.');
    return (
      BigInt(whole) * (scale === 2 ? 100n : 10n) +
      BigInt(fraction.padEnd(scale, '0'))
    );
  };
  const canonical = scale === 2 ? kg(value) : rpe(value);
  const normalizedStep = step.includes('.') ? step : `${step}.0`;
  const total =
    toUnits(canonical) + BigInt(direction) * toUnits(normalizedStep);
  const factor = scale === 2 ? 100n : 10n;
  const bounded =
    total < (scale === 1 ? 10n : 0n)
      ? scale === 1
        ? 10n
        : 0n
      : scale === 1 && total > 100n
        ? 100n
        : total;
  const result = `${bounded / factor}.${String(bounded % factor).padStart(scale, '0')}`;
  return scale === 2 ? kg(result) : rpe(result);
}
export function integerInput(value: string): number {
  if (!/^\d+$/.test(value.trim())) throw new Error('Invalid integer');
  const n = Number(value);
  if (!Number.isSafeInteger(n)) throw new Error('Invalid integer');
  return n;
}
export function stepInteger(
  value: string,
  direction: 1 | -1,
  {
    min,
    max,
    step = 1,
    initial = min,
  }: { min: number; max: number; step?: number; initial?: number },
): string {
  if (!value.trim()) return String(initial);
  return String(
    Math.min(max, Math.max(min, integerInput(value) + direction * step)),
  );
}
export function restDisplay(seconds: number | null | undefined): string {
  if (seconds == null) return '';
  return seconds < 60
    ? String(seconds)
    : `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
export function moved<T>(items: T[], index: number, delta: 1 | -1): T[] {
  const next = [...items],
    target = index + delta;
  if (index < 0 || index >= next.length || target < 0 || target >= next.length)
    return next;
  const current = next[index]!;
  next[index] = next[target]!;
  next[target] = current;
  return next;
}
export function loadFields(
  mode: 'bodyweight' | 'weighted' | 'external' | 'assisted',
) {
  return {
    load: mode === 'weighted' || mode === 'external',
    assistance: mode === 'assisted',
  };
}
export function statusKey(status: 'draft' | 'active' | 'archived') {
  return `status.${status}` as const;
}
