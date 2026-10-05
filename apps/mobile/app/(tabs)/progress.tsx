import ChartNoAxesCombined from 'lucide-react-native/icons/chart-no-axes-combined';
import { useTranslation } from 'react-i18next';
import { colors, Screen, Text } from '@jimo/ui';
import { EmptyState } from '../../src/components/EmptyState';
export default function PlaceholderScreen() {
  const { t } = useTranslation(['common', 'navigation']);
  return (
    <Screen bottomInset={false}>
      <Text variant="h1" accessibilityRole="header">
        {t('navigation:progress')}
      </Text>
      <EmptyState
        icon={<ChartNoAxesCombined size={32} color={colors.primary} />}
        title={t('progress.empty')}
        description={t('progress.description')}
      />
    </Screen>
  );
}
