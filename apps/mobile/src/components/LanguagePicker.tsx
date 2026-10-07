import type { LocalePreference } from '@jimo/schemas';
import { useTranslation } from 'react-i18next';
import { OptionCard } from './OptionCard';
import { usePreferences } from '../storage/PreferencesProvider';
export function LanguagePicker({
  compact = false,
  onChange,
  disabled = false,
}: {
  compact?: boolean;
  onChange?: (locale: LocalePreference) => Promise<void>;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const { preferences, changeLocale, saving } = usePreferences();
  return (
    <>
      {(['system', 'it', 'en'] as const).map((locale: LocalePreference) => (
        <OptionCard
          key={locale}
          compact={compact}
          label={t(`languages.${locale}`)}
          selected={preferences?.localePreference === locale}
          disabled={saving || disabled}
          onPress={() => {
            if (onChange) void onChange(locale);
            else void changeLocale(locale);
          }}
        />
      ))}
    </>
  );
}
