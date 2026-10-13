import { useIsFocused } from 'expo-router';
import { Screen, animePink } from '@jimo/ui';

import { useTranslation } from 'react-i18next';
import { View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from 'expo-router/js-tabs';
import { StatusBar } from 'expo-status-bar';
import { HeroTitle } from '../../src/themes/anime-pink/HeroTitle';
import {
  SectionHeroScope,
  SectionHeroCanvas,
  SectionHeroFrame,
  useSectionStatusBar,
  useSectionHeroGeometry,
} from '../../src/components/SectionHero';
import { WorkoutSchedule } from '../../src/workouts/Schedule';
import { artwork } from '../../src/workouts/visual/theme';
function WorkoutHub() {
  const { t } = useTranslation('workouts'),
    { width } = useWindowDimensions(),
    insets = useSafeAreaInsets(),
    tabHeight = useBottomTabBarHeight();
  const focused = useIsFocused();
  const geometry = useSectionHeroGeometry();
  const status = useSectionStatusBar(
    true,
    geometry.height + insets.top - 24,
    insets.top,
  );
  return (
    <Screen
      onScroll={status.onScroll}
      edgeToEdge
      bottomInset={false}
      surfaceStyle={{ backgroundColor: animePink.background }}
      contentStyle={{
        padding: 0,
        gap: 0,
        paddingTop: insets.top,
        paddingBottom: tabHeight + 24,
      }}
    >
      {focused ? <StatusBar style={status.style} /> : null}
      <SectionHeroCanvas
        source={artwork.background}
        width={width}
        topInset={insets.top}
        sideInset={insets.left + 20}
        dark
        bodyColor={animePink.background}
      >
        <View
          style={{
            paddingLeft: insets.left + 20,
            paddingRight: insets.right + 20,
          }}
        >
          <SectionHeroFrame
            testID="workout-hub-hero"
            style={{ justifyContent: 'flex-start', paddingTop: 18 }}
          >
            <HeroTitle>{t('title').toUpperCase()}</HeroTitle>
          </SectionHeroFrame>
        </View>
      </SectionHeroCanvas>
      <View
        testID="workout-hub-body"
        style={{
          backgroundColor: animePink.background,
          paddingVertical: 20,
          paddingLeft: insets.left + 20,
          paddingRight: insets.right + 20,
          gap: 16,
        }}
      >
        <WorkoutSchedule />
      </View>
    </Screen>
  );
}

export default function WorkoutTab() {
  return (
    <SectionHeroScope>
      <WorkoutHub />
    </SectionHeroScope>
  );
}
