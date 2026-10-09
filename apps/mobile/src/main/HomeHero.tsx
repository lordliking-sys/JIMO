import { View, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { HeroReadabilityWash } from '../components/HeroReadabilityWash';
import { MainText } from './Surface';
import { mainInk } from './theme';
import type { greetingPeriod } from '../home/greeting';

export function HomeHero({
  name,
  greeting,
}: {
  name: string | undefined;
  greeting: ReturnType<typeof greetingPeriod>;
}) {
  const { t } = useTranslation(['main', 'common']),
    { width } = useWindowDimensions(),
    compact = width < 360;
  return (
    <View
      testID="home-hero"
      style={{
        minHeight: Math.min(width, 560) * 0.7,
        paddingTop: 14,
        paddingLeft: 8,
        paddingBottom: 20,
      }}
    >
      <View testID="home-hero-copy" style={{ maxWidth: compact ? 180 : 210 }}>
        <HeroReadabilityWash testID="home-readability-wash" />
        <MainText
          testID="home-brand"
          style={{
            fontSize: compact ? 44 : 50,
            lineHeight: compact ? 50 : 56,
            letterSpacing: 1,
          }}
        >
          JIMO
        </MainText>
        <View
          accessible={false}
          style={{
            width: 88,
            height: 2,
            backgroundColor: mainInk.green,
            transform: [{ rotate: '-1deg' }],
            marginLeft: 3,
            marginBottom: 14,
          }}
        />
        <MainText
          testID="home-greeting"
          accessibilityRole="header"
          style={{ fontSize: compact ? 22 : 24, lineHeight: 28 }}
        >
          {t(`common:home.greetings.${greeting}`)}
        </MainText>
        {name ? (
          <MainText
            testID="home-name"
            style={{ fontSize: compact ? 29 : 32, lineHeight: 36 }}
          >
            {name}
          </MainText>
        ) : null}
        <MainText
          testID="home-motto"
          style={{
            fontSize: 15,
            lineHeight: 20,
            maxWidth: compact ? 164 : 180,
            marginTop: 6,
          }}
        >
          {t('motto')}
        </MainText>
      </View>
    </View>
  );
}
