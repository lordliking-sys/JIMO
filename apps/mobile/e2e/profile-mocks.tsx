/** Browser-only component fixture. It never replaces providers in the Expo app. */
import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { View } from 'react-native';
import { i18n } from '../src/i18n';
import type { Profile, ProfileUpdate } from '@jimo/schemas';

const initial: Profile = {
  id: '7cf8a71c-9dc4-48ab-a245-df1bfb7d063e',
  displayName: 'Ada Bianchi',
  locale: 'it',
  unitSystem: 'metric',
  createdAt: '2026-10-07T00:00:00Z',
  initialized: true,
};
type FixtureState = {
  profile: Profile;
  update: (patch: ProfileUpdate) => Promise<void>;
  signedOut: boolean;
  logout: () => Promise<void>;
  loginAs: (id: string) => void;
};
const Context = createContext<FixtureState | null>(null);
export const actions: ProfileUpdate[] = [];
export function FixtureProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState(initial),
    [signedOut, setSignedOut] = useState(false);
  return (
    <Context.Provider
      value={{
        profile,
        signedOut,
        logout: async () => setSignedOut(true),
        loginAs: (id) => {
          setSignedOut(false);
          setProfile({
            ...initial,
            id,
            displayName:
              id === initial.id ? initial.displayName : 'Bruno Verdi',
          });
        },
        update: async (patch) => {
          actions.push(patch);
          setProfile((current) => ({
            ...current,
            displayName:
              patch.displayName !== undefined
                ? patch.displayName
                : current.displayName,
            locale: patch.locale ?? current.locale,
            unitSystem: patch.unitSystem ?? current.unitSystem,
          }));
          if (patch.locale)
            await i18n.changeLanguage(
              patch.locale === 'system' ? 'it' : patch.locale,
            );
        },
      }}
    >
      {signedOut ? (
        <View accessibilityRole="alert">Fixture signed out</View>
      ) : (
        children
      )}
    </Context.Provider>
  );
}
export function useAccount() {
  const state = useContext(Context)!;
  return { ...state, resolved: true, error: false, retry: () => {} };
}
export function useAuthSession() {
  return { email: 'ada@example.invalid' };
}
export function usePreferences() {
  const state = useContext(Context)!;
  return {
    preferences: { localePreference: state.profile.locale },
    saving: false,
    saveError: false,
    changeLocale: async (locale: Profile['locale']) => state.update({ locale }),
  };
}
export function useOffline() {
  const state = useContext(Context)!;
  const runtime = useMemo(
    () => ({
      owner: state.profile.id,
      online: !new URLSearchParams(location.search).has('offline'),
      workouts: {
        active: async () =>
          new URLSearchParams(location.search).has('active')
            ? { id: 'existing-session' }
            : null,
      },
      outbox: {
        list: async () =>
          new URLSearchParams(location.search).has('pending') ? [{}] : [],
      },
      metadata: async (owner: string, key: string, value?: string) => {
        const name = `profileFixture:${owner}:${key}`;
        if (value !== undefined) localStorage.setItem(name, value);
        return localStorage.getItem(name);
      },
    }),
    [state.profile.id],
  );
  return { runtime };
}
export function progressParams(range: string) {
  return { range, timeZone: 'Europe/Rome' };
}
export function useProgressQuery() {
  return {
    data: new URLSearchParams(location.search).has('empty')
      ? undefined
      : {
          stale: false,
          fetchedAt: '2026-10-09T00:00:00Z',
          payload: {
            period: {
              range: '8w',
              timeZone: 'Europe/Rome',
              from: '2026-08-15T00:00:00Z',
              to: '2026-10-09T00:00:00Z',
              effectiveWeeks: 8,
            },
            completedWorkouts: 7,
            completedSets: 39,
            sessionsPerWeek: 0.875,
          },
        },
    error: false,
  };
}
export function useIsFocused() {
  return true;
}
export function useBottomTabBarHeight() {
  return 120;
}
export function useSafeAreaInsets() {
  return { top: 24, bottom: 48, left: 0, right: 0 };
}
export function SafeAreaView({ children }: { children: ReactNode }) {
  return <View>{children}</View>;
}
export function useFonts() {
  return [false];
}
export function StatusBar({ style }: { style: string }) {
  return <View testID={`fixture-status-bar-${style}`} />;
}
