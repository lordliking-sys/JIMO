import type { LocalePreference } from '@jimo/schemas';
import { useTranslation } from 'react-i18next';
import { OptionCard } from './OptionCard';
import { usePreferences } from '../storage/PreferencesProvider';
export function LanguagePicker() {
  const { t } = useTranslation();
  const { preferences, changeLocale, saving } = usePreferences();
  return (
    <>
      {(['system', 'it', 'en'] as const).map((locale: LocalePreference) => (
        <OptionCard
          key={locale}
          label={t(`languages.${locale}`)}
          selected={preferences?.localePreference === locale}
          disabled={saving}
          onPress={() => {
            void changeLocale(locale);
          }}
        />
      ))}
    </>
  );
}
