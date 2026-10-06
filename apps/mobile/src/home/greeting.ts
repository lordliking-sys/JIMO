/** Device-local time; nighttime keeps the evening greeting. */
export function greetingPeriod(
  date: Date,
): 'morning' | 'afternoon' | 'evening' {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  return 'evening';
}
