import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text, colors } from '@jimo/ui';
/** Neutral placeholder. Supply the final original JIMO artwork through asset. */
export function BrandMark({
  compact = false,
  subtle = false,
  asset,
}: {
  compact?: boolean;
  subtle?: boolean;
  asset?: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={t('brand.name')}
    >
      {asset ? (
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          aria-hidden
        >
          {asset}
        </View>
      ) : (
        <Text
          accessible={false}
          variant={subtle ? 'caption' : compact ? 'h2' : 'display'}
          color={subtle ? colors.secondary : colors.text}
          style={{ letterSpacing: subtle ? 2 : -1 }}
        >
          {t('brand.name')}
        </Text>
      )}
    </View>
  );
}
