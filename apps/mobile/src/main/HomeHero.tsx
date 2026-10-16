import type { ImageSourcePropType } from 'react-native';
import { useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { animePink } from '@jimo/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SectionHeroFrame } from '../components/SectionHero';
import { ThemeArtwork } from '../themes/anime-pink/Artwork';
import { HeroTitle } from '../themes/anime-pink/HeroTitle';
/** Explicit external-asset slot, also available outside the shared tab frame. */
export function HomeHeroArtwork({
  source,
}: {
  source?: ImageSourcePropType | null;
}) {
  return (
    <ThemeArtwork
      source={source}
      testID="home-hero-artwork"
      bodyColor={animePink.background}
    />
  );
}
export function HomeHero() {
  const { t } = useTranslation(['common', 'navigation']),
    { width } = useWindowDimensions(),
    insets = useSafeAreaInsets();
  return (
    <SectionHeroFrame
      testID="home-hero"
      style={{
        paddingTop: 22,
        justifyContent: 'flex-start',
        minHeight: width * 1.02 + 24 - insets.top,
      }}
    >
      <HeroTitle testID="home-brand" accessibilityRole="header">
        {t('navigation:home').toUpperCase()}
      </HeroTitle>
    </SectionHeroFrame>
  );
}
