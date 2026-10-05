import type { LocalePreference } from '@jimo/schemas';
export type SupportedLocale = 'it' | 'en';
export function resolveLocale(
  preference: LocalePreference,
  deviceLanguage: string | null | undefined,
): SupportedLocale {
  if (preference !== 'system') return preference;
  return deviceLanguage?.toLowerCase().split(/[-_]/)[0] === 'it' ? 'it' : 'en';
}
