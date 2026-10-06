import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import Settings from 'lucide-react-native/icons/settings';
import { Card, colors, Screen, Text, spacing, sizes } from '@jimo/ui';
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
      <Card style={{ padding: spacing.lg, gap: spacing.md }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
          }}
        >
          <Settings
            color={colors.secondary}
            size={sizes.icon}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
          <Text variant="h3">{t('language')}</Text>
        </View>
        <Text variant="caption" color={colors.secondary}>
          {t('profile.languageHelp')}
        </Text>
        <LanguagePicker compact />
      </Card>
      {saveError ? (
        <Text color={colors.danger} accessibilityRole="alert">
          {t('saveError')}
        </Text>
      ) : null}
    </Screen>
  );
}
