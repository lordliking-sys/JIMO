import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
export function useClock(onForeground?: () => void) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    let active =
      AppState.currentState == null || AppState.currentState === 'active';
    let timer: ReturnType<typeof setInterval> | undefined;
    const start = () => {
      timer ??= setInterval(tick, 1000);
    };
    const stop = () => {
      if (timer !== undefined) clearInterval(timer);
      timer = undefined;
    };
    if (active) start();
    const listener = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        if (active) return;
        active = true;
        tick();
        start();
        onForeground?.();
      } else {
        active = false;
        stop();
      }
    });
    return () => {
      stop();
      listener.remove();
    };
  }, [onForeground]);
  return now;
}
