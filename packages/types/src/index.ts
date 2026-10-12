export type HealthStatus = {
  status: 'ok';
  service: string;
};

// Supported application preferences; adding a locale does not change SQL.
export const localePreferences = ['system', 'it', 'en'] as const;
export type LocalePreference = (typeof localePreferences)[number];

export type WorkoutMode = 'standard' | 'pyramid' | 'emom';
/** Ordered array: position is the set index; decimal values stay canonical strings. */
export type PerSetTarget = {
  targetReps: number | null;
  targetDurationSeconds: number | null;
  targetLoadKg: string | null;
  targetAssistanceKg: string | null;
  targetRpe: string | null;
  restSeconds: number | null;
};
