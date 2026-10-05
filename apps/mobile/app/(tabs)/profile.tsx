import { useTranslation } from 'react-i18next';
import { Card, colors, Screen, Text } from '@jimo/ui';
import { LanguagePicker } from '../../src/components/LanguagePicker';
import { usePreferences } from '../../src/storage/PreferencesProvider';
export default function ProfileScreen() {
  const { t } = useTranslation(['common', 'navigation']);
  const { saveError } = usePreferences();
  return (
    <Screen bottomInset={false}>
      <Text variant="h1" accessibilityRole="header">
        {t('navigation:profile')}
      </Text>
      <Text color={colors.secondary}>{t('profile.description')}</Text>
      <Card>
        <Text variant="h3">{t('language')}</Text>
        <Text color={colors.secondary}>{t('profile.languageHelp')}</Text>
        <LanguagePicker />
      </Card>
      {saveError ? (
        <Text color={colors.danger} accessibilityRole="alert">
          {t('saveError')}
        </Text>
      ) : null}
    </Screen>
  );
}
