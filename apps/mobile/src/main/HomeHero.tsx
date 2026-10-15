import type { ImageSourcePropType } from 'react-native';
import { View, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text, animePink } from '@jimo/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SectionHeroFrame } from '../components/SectionHero';
import { ThemeArtwork } from '../themes/anime-pink/Artwork';
import { HeroTitle } from '../themes/anime-pink/HeroTitle';
import { greetingPeriod } from '../home/greeting';
import { useAccount } from '../auth/AccountProvider';
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
    { profile } = useAccount(),
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
      <Text
        testID="home-brand"
        variant="caption"
        color={animePink.white}
        style={{ letterSpacing: 3, marginBottom: 10 }}
      >
        {t('navigation:home').toUpperCase()}
      </Text>
      <HeroTitle
        accessibilityRole="header"
        style={{ fontSize: 28, lineHeight: 32, maxWidth: width * 0.43 }}
      >
        {t(`home.greetings.${greetingPeriod(new Date())}`)}
        {profile?.displayName
          ? `
${profile.displayName}`
          : ''}
      </HeroTitle>
      <View style={{ height: 12 }} />
    </SectionHeroFrame>
  );
}
