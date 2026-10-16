import type { ReactNode } from 'react';
import { Image, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { officialJimoLogo, logoAspectRatio } from './brand-asset';
/** Shared official identity; callers can supply an explicitly sized image through asset. */
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
        <Image
          source={officialJimoLogo}
          resizeMode="contain"
          accessible={false}
          style={{
            width: subtle ? 80 : compact ? 112 : 216,
            height: (subtle ? 80 : compact ? 112 : 216) / logoAspectRatio,
          }}
        />
      )}
    </View>
  );
}
