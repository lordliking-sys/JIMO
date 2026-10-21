import { useClock } from '../src/workouts/useClock';
export { clockDevice } from './device-clock-fixture';
export function ClockProbe({ onForeground }: { onForeground: () => void }) {
  useClock(onForeground);
  return null;
}
