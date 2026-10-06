import Dumbbell from 'lucide-react-native/icons/dumbbell';
import { useTranslation } from 'react-i18next';
import { colors, Screen } from '@jimo/ui';
import { EmptyState } from '../../src/components/EmptyState';
import { ScreenHeader } from '../../src/components/ScreenHeader';
export default function PlaceholderScreen() {
  const { t } = useTranslation(['common', 'navigation']);
  return (
    <Screen bottomInset={false}>
      <ScreenHeader title={t('navigation:workout')} light />
      <EmptyState
        icon={<Dumbbell size={32} color={colors.primary} />}
        title={t('workout.empty')}
        description={t('workout.description')}
      />
    </Screen>
  );
}
