import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { greetingPeriod } from './greeting';
export function useGreeting() {
  const [period, setPeriod] = useState(() => greetingPeriod(new Date()));
  const refresh = useCallback(() => setPeriod(greetingPeriod(new Date())), []);
  useFocusEffect(refresh);
  useEffect(() => {
    const timer = setInterval(refresh, 60_000);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, [refresh]);
  return period;
}
