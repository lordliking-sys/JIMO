import { Text } from '@jimo/ui';
import { useTranslation } from 'react-i18next';
export function Wordmark({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation();
  return (
    <Text variant={compact ? 'h2' : 'display'} accessibilityRole="header">
      {t('brand.name')}
    </Text>
  );
}
