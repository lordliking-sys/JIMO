import type { ImageSourcePropType } from 'react-native';
import { View } from 'react-native';
import { useId } from 'react';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { animePink } from '@jimo/ui';
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
    id = `home-title-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <SectionHeroFrame
      testID="home-hero"
      style={{
        paddingTop: 22,
        justifyContent: 'flex-start',
      }}
    >
      <View style={{ alignSelf: 'flex-start' }}>
        <Svg
          accessible={false}
          pointerEvents="none"
          width={180}
          height={86}
          style={{ position: 'absolute', left: -28, top: -24 }}
        >
          <Defs>
            <RadialGradient id={id} cx="46%" cy="50%" rx="54%" ry="50%">
              <Stop offset="0" stopColor="#23101F" stopOpacity={0.72} />
              <Stop offset="0.55" stopColor="#23101F" stopOpacity={0.36} />
              <Stop offset="1" stopColor="#23101F" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect width="100%" height="100%" fill={`url(#${id})`} />
        </Svg>
        <HeroTitle testID="home-brand" accessibilityRole="header">
          {t('navigation:home').toUpperCase()}
        </HeroTitle>
      </View>
    </SectionHeroFrame>
  );
}
