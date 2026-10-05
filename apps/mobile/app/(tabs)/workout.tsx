import Dumbbell from 'lucide-react-native/icons/dumbbell';
import { useTranslation } from 'react-i18next';
import { colors, Screen, Text } from '@jimo/ui';
import { EmptyState } from '../../src/components/EmptyState';
export default function PlaceholderScreen() {
  const { t } = useTranslation(['common', 'navigation']);
  return (
    <Screen bottomInset={false}>
      <Text variant="h1" accessibilityRole="header">
        {t('navigation:workout')}
      </Text>
      <EmptyState
        icon={<Dumbbell size={32} color={colors.primary} />}
        title={t('workout.empty')}
        description={t('workout.description')}
      />
    </Screen>
  );
}
