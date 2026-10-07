import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Text, Screen, Button, colors } from '@jimo/ui';
import { openLocalDatabase } from './open';
import { OfflineRuntime } from './runtime';
const Context = createContext<{
  runtime: OfflineRuntime;
  revision: number;
} | null>(null);
let runtimePromise: Promise<OfflineRuntime> | undefined;
function open() {
  runtimePromise ??= openLocalDatabase()
    .then(async (db) => {
      const runtime = new OfflineRuntime(db);
      await runtime.hydrate();
      return runtime;
    })
    .catch((e) => {
      runtimePromise = undefined;
      throw e;
    });
  return runtimePromise;
}
export function OfflineProvider({ children }: { children: ReactNode }) {
  const [runtime, setRuntime] = useState<OfflineRuntime | null>(null),
    [revision, setRevision] = useState(0),
    [error, setError] = useState(false),
    [attempt, setAttempt] = useState(0);
  const cache = useQueryClient(),
    { t, i18n } = useTranslation('workouts');
  useEffect(() => {
    let live = true;
    void open()
      .then((r) => {
        if (live) {
          setRuntime(r);
          setError(false);
        }
      })
      .catch(() => {
        if (live) setError(true);
      });
    return () => {
      live = false;
    };
  }, [attempt]);
  useEffect(() => {
    if (!runtime) return;
    let progressRevision = runtime.progressRevision,
      previousOnline = runtime.online;
    const unsubscribe = runtime.subscribe(() => {
      setRevision((v) => v + 1);
      void cache.invalidateQueries({ queryKey: ['local'] });
      if (
        progressRevision !== runtime.progressRevision ||
        (!previousOnline && runtime.online)
      ) {
        progressRevision = runtime.progressRevision;
        void cache.invalidateQueries({ queryKey: ['progress'] });
      }
      previousOnline = runtime.online;
    });
    const network = NetInfo.addEventListener((state) => {
      runtime.setNetwork(
        state.isConnected !== false && state.isInternetReachable !== false,
      );
    });
    const foreground = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void runtime.engine.request(true);
        void cache.invalidateQueries({ queryKey: ['progress'] });
      }
    });
    void runtime.engine.request(true);
    return () => {
      unsubscribe();
      network();
      foreground.remove();
    };
  }, [runtime, cache]);
  useEffect(() => {
    if (runtime) {
      runtime.setLocale(i18n.resolvedLanguage === 'it' ? 'it' : 'en');
      void runtime.engine.request(true);
    }
  }, [runtime, i18n.resolvedLanguage]);
  if (!runtime)
    return (
      <Screen>
        <Text
          accessibilityRole={error ? 'alert' : undefined}
          color={error ? colors.danger : colors.text}
        >
          {error ? t('offline.storageUnavailable') : t('loading')}
        </Text>
        {error ? (
          <Button
            label={t('offline.retry')}
            onPress={() => {
              setError(false);
              setAttempt((a) => a + 1);
            }}
          />
        ) : null}
      </Screen>
    );
  return (
    <Context.Provider value={{ runtime, revision }}>
      {children}
    </Context.Provider>
  );
}
export function useOffline() {
  const state = useContext(Context);
  if (!state) throw new Error('OfflineProvider missing');
  return state;
}
