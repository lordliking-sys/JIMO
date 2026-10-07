export const weekdayNumbers = [1, 2, 3, 4, 5, 6, 7] as const;
export type Weekday = (typeof weekdayNumbers)[number];
export function weekdayValue(value: string): Weekday | null {
  if (value === '') return null;
  if (!/^[1-7]$/.test(value)) throw new Error('Invalid weekday');
  return Number(value) as Weekday;
}
