import ChartNoAxesCombined from 'lucide-react-native/icons/chart-no-axes-combined';
import { useTranslation } from 'react-i18next';
import { colors, Screen } from '@jimo/ui';
import { EmptyState } from '../../src/components/EmptyState';
import { ScreenHeader } from '../../src/components/ScreenHeader';
export default function PlaceholderScreen() {
  const { t } = useTranslation(['common', 'navigation']);
  return (
    <Screen bottomInset={false}>
      <ScreenHeader title={t('navigation:progress')} light />
      <EmptyState
        icon={<ChartNoAxesCombined size={32} color={colors.primary} />}
        title={t('progress.empty')}
        description={t('progress.description')}
      />
    </Screen>
  );
}
