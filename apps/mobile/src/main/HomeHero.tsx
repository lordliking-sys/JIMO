import type { ImageSourcePropType } from 'react-native';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text, animePink } from '@jimo/ui';
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
    { profile } = useAccount();
  return (
    <SectionHeroFrame
      testID="home-hero"
      style={{ paddingTop: 22, justifyContent: 'flex-start' }}
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
        style={{ fontSize: 36, lineHeight: 39 }}
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
