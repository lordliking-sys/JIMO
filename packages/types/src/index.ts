export type HealthStatus = {
  status: 'ok';
  service: string;
};

// Supported application preferences; adding a locale does not change SQL.
export const localePreferences = ['system', 'it', 'en'] as const;
export type LocalePreference = (typeof localePreferences)[number];
