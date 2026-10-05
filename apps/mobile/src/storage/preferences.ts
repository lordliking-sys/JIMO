import { onboardingSchema, preferencesSchema } from '@jimo/schemas';
import type { OnboardingData, Preferences } from '@jimo/schemas';
export const PREFERENCES_KEY = 'jimo.preferences.v1';
export function defaultPreferences(): Preferences {
  return {
    version: 1,
    onboardingCompleted: false,
    localePreference: 'system',
    onboarding: null,
  };
}
export function decodePreferences(raw: string | null): Preferences {
  if (raw === null) return defaultPreferences();
  try {
    const result = preferencesSchema.safeParse(JSON.parse(raw));
    return result.success ? result.data : defaultPreferences();
  } catch {
    return defaultPreferences();
  }
}
export function finishOnboarding(
  current: Preferences,
  input: OnboardingData,
): Preferences {
  const onboarding = onboardingSchema.parse(input);
  return preferencesSchema.parse({
    ...current,
    onboardingCompleted: true,
    localePreference: onboarding.locale,
    onboarding,
  });
}
export function initialDestination(
  preferences: Preferences,
): '/onboarding' | '/' {
  return preferences.onboardingCompleted ? '/' : '/onboarding';
}
export type StorageDriver = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
};
export function createPreferencesStore(driver: StorageDriver) {
  return {
    async load(): Promise<Preferences> {
      return decodePreferences(await driver.getItem(PREFERENCES_KEY));
    },
    async save(preferences: Preferences): Promise<void> {
      await driver.setItem(
        PREFERENCES_KEY,
        JSON.stringify(preferencesSchema.parse(preferences)),
      );
    },
  };
}
