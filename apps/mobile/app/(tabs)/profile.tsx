import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import Languages from 'lucide-react-native/icons/languages';
import { Card, colors, Screen, Text, spacing, sizes } from '@jimo/ui';
import { LanguagePicker } from '../../src/components/LanguagePicker';
import { usePreferences } from '../../src/storage/PreferencesProvider';
import { ScreenHeader } from '../../src/components/ScreenHeader';
export default function ProfileScreen() {
  const { t } = useTranslation(['common', 'navigation']);
  const { saveError } = usePreferences();
  return (
    <Screen bottomInset={false}>
      <ScreenHeader
        title={t('navigation:profile')}
        subtitle={t('profile.description')}
        light
      />
      <Card style={{ padding: spacing.lg, gap: spacing.sm }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
          }}
        >
          <Languages
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
