import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
export function useClock(onForeground?: () => void) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const timer = setInterval(tick, 1000);
    const listener = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        tick();
        onForeground?.();
      }
    });
    return () => {
      clearInterval(timer);
      listener.remove();
    };
  }, [onForeground]);
  return now;
}
