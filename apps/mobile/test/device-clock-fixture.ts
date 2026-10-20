export const clockDevice = {
  state: 'active',
  now: 0,
  updates: 0,
  listeners: new Set<(state: string) => void>(),
  cleanup: undefined as (() => void) | undefined,
  emit(state: string) {
    this.state = state;
    for (const listener of this.listeners) listener(state);
  },
};
export const AppState = {
  get currentState() {
    return clockDevice.state;
  },
  addEventListener(_event: 'change', callback: (state: string) => void) {
    clockDevice.listeners.add(callback);
    return { remove: () => clockDevice.listeners.delete(callback) };
  },
};
export function useState(initial: () => number) {
  clockDevice.now = initial();
  return [
    clockDevice.now,
    (next: number) => {
      clockDevice.now = next;
      clockDevice.updates++;
    },
  ] as const;
}
export function useEffect(effect: () => (() => void) | undefined) {
  clockDevice.cleanup = effect();
}
