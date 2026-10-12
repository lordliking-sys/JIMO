import { useState } from 'react';
import { Button, Text, colors, Screen } from '@jimo/ui';
import {
  WorkoutVisualPreview,
  type PreviewMode,
} from '../../src/workouts/visual/WorkoutVisualPreview';
import { useTranslation } from 'react-i18next';
import { View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from 'expo-router/js-tabs';
import { StatusBar } from 'expo-status-bar';
import { useIsFocused } from 'expo-router';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import {
  SectionHeroScope,
  SectionHeroCanvas,
  SectionHeroFrame,
} from '../../src/components/SectionHero';
import { WorkoutSchedule } from '../../src/workouts/Schedule';
import { artwork, ink } from '../../src/workouts/visual/theme';
export default function WorkoutTab() {
  const [preview, setPreview] = useState<PreviewMode | null>(null);
  const { t } = useTranslation('workouts'),
    { width } = useWindowDimensions(),
    insets = useSafeAreaInsets(),
    tabHeight = useBottomTabBarHeight(),
    focused = useIsFocused();
  return (
    <SectionHeroScope>
      <Screen
        edgeToEdge
        bottomInset={false}
        surfaceStyle={{ backgroundColor: ink.background }}
        contentStyle={{
          padding: 0,
          gap: 0,
          paddingTop: insets.top,
          paddingBottom: tabHeight + 24,
        }}
      >
        {focused ? <StatusBar style="light" /> : null}
        <SectionHeroCanvas
          source={artwork.background}
          width={width}
          topInset={insets.top}
          sideInset={insets.left + 20}
          dark
          bodyColor={ink.background}
        >
          <View
            style={{
              paddingLeft: insets.left + 20,
              paddingRight: insets.right + 20,
            }}
          >
            <SectionHeroFrame testID="workout-hub-hero">
              <ScreenHeader title={t('title')} light />
            </SectionHeroFrame>
          </View>
        </SectionHeroCanvas>
        <View
          testID="workout-hub-body"
          style={{
            backgroundColor: ink.background,
            paddingVertical: 20,
            paddingLeft: insets.left + 20,
            paddingRight: insets.right + 20,
            gap: 16,
          }}
        >
          <WorkoutSchedule />
          <View style={{ gap: 4 }}>
            <Text variant="caption" color={colors.secondary}>
              {t('visual.previews')}
            </Text>
            <Button
              variant="text"
              label={t('visual.emomPreview')}
              onPress={() => setPreview('emom')}
            />
            <Button
              variant="text"
              label={t('visual.pyramidPreview')}
              onPress={() => setPreview('pyramid')}
            />
          </View>
          <WorkoutVisualPreview
            mode={preview}
            onClose={() => setPreview(null)}
          />
        </View>
      </Screen>
    </SectionHeroScope>
  );
}
