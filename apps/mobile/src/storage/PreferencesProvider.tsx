import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import * as Font from 'expo-font';
import { useLocales } from 'expo-localization';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import type {
  LocalePreference,
  OnboardingData,
  Preferences,
} from '@jimo/schemas';
import { i18n } from '../i18n';
import { resolveLocale } from '../i18n/locale';
import { createPreferencesStore, finishOnboarding } from './preferences';
const store = createPreferencesStore(AsyncStorage);
type PreferencesContextValue = {
  preferences: Preferences | null;
  startupError: boolean;
  saving: boolean;
  saveError: boolean;
  retry: () => void;
  changeLocale: (locale: LocalePreference) => Promise<boolean>;
  complete: (data: OnboardingData) => Promise<boolean>;
};
const PreferencesContext = createContext<PreferencesContextValue | null>(null);
export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [startupError, setStartupError] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const savingRef = useRef(false);
  const deviceLanguage = useLocales()[0]?.languageCode;
  const deviceLanguageRef = useRef(deviceLanguage);
  useEffect(() => {
    deviceLanguageRef.current = deviceLanguage;
  }, [deviceLanguage]);
  useEffect(() => {
    let active = true;
    async function bootstrap() {
      setStartupError(false);
      try {
        await i18n.changeLanguage(
          resolveLocale('system', deviceLanguageRef.current),
        );
        const stored = await store.load();
        await Font.loadAsync({
          Inter_400Regular,
          Inter_500Medium,
          Inter_600SemiBold,
          Inter_700Bold,
        });
        await i18n.changeLanguage(
          resolveLocale(stored.localePreference, deviceLanguageRef.current),
        );
        if (active) setPreferences(stored);
      } catch {
        if (active) setStartupError(true);
      }
    }
    void bootstrap();
    return () => {
      active = false;
    };
  }, [attempt]);
  useEffect(() => {
    if (preferences)
      void i18n.changeLanguage(
        resolveLocale(preferences.localePreference, deviceLanguage),
      );
  }, [preferences, deviceLanguage]);
  const persist = useCallback(async (next: Preferences): Promise<boolean> => {
    if (savingRef.current) return false;
    savingRef.current = true;
    setSaving(true);
    setSaveError(false);
    try {
      await store.save(next);
      await i18n.changeLanguage(
        resolveLocale(next.localePreference, deviceLanguageRef.current),
      );
      setPreferences(next);
      return true;
    } catch {
      setSaveError(true);
      return false;
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }, []);
  return (
    <PreferencesContext.Provider
      value={{
        preferences,
        startupError,
        saving,
        saveError,
        retry: () => setAttempt((value) => value + 1),
        changeLocale: async (locale) =>
          preferences
            ? persist({ ...preferences, localePreference: locale })
            : false,
        complete: async (data) => {
          if (!preferences) return false;
          const next = finishOnboarding(preferences, data);
          return persist(next);
        },
      }}
    >
      {children}
    </PreferencesContext.Provider>
  );
}
export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) throw new Error('PreferencesProvider is required');
  return context;
}
