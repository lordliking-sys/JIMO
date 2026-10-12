import { integerInput, restDisplay } from './helpers';
export function restControlLabel(value: string, seconds: string) {
  if (!value.trim()) return '—';
  try {
    const n = integerInput(value);
    return n < 60 ? `${n} ${seconds}` : restDisplay(n);
  } catch {
    return value;
  }
}
export function stepRestControl(value: string, direction: 1 | -1) {
  if (!value.trim()) return direction === 1 ? '15' : '';
  return String(
    Math.min(86400, Math.max(0, integerInput(value) + direction * 15)),
  );
}
