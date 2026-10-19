import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Text, animePink } from '@jimo/ui';
import { ThemeArtwork } from '../../themes/anime-pink/Artwork';
import { SafeBack } from '../../navigation/SafeBack';
import { SectionStatusFade } from '../../components/SectionStatusFade';
import { useSectionStatusBar } from '../../components/SectionHero';
import { artwork } from './theme';

/** Compact workout header and one pink body; review and saved summaries share this surface. */
export function WorkoutSummarySurface({
  title,
  children,
  footer,
}: {
  title: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  const insets = useSafeAreaInsets(),
    height = 152 + insets.top;
  const status = useSectionStatusBar(true, height - 24, insets.top);
  return (
    <View
      testID="workout-summary-screen"
      style={{ flex: 1, backgroundColor: animePink.background }}
    >
      <StatusBar style={status.style} />
      <ScrollView
        testID="workout-summary-scroll"
        onScroll={status.onScroll}
        scrollEventThrottle={16}
        contentInsetAdjustmentBehavior="never"
        bounces={false}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        <View
          style={{
            minHeight: height,
            paddingTop: insets.top + 12,
            paddingHorizontal: 16 + insets.left,
            paddingBottom: 44,
            gap: 8,
          }}
        >
          <ThemeArtwork source={artwork.background} />
          <View style={{ alignSelf: 'flex-start' }}>
            <SafeBack fallback="/" color={animePink.white} />
          </View>
          <Text
            accessibilityRole="header"
            variant="h2"
            color={animePink.white}
            style={{ paddingHorizontal: 4, fontSize: 25, lineHeight: 31 }}
          >
            {title}
          </Text>
        </View>
        <View
          testID="workout-summary-body"
          style={{
            marginTop: -24,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingTop: 24,
            paddingLeft: 20 + insets.left,
            paddingRight: 20 + insets.right,
            paddingBottom: 24,
            gap: 16,
            backgroundColor: animePink.background,
          }}
        >
          {children}
        </View>
      </ScrollView>
      <View
        testID="workout-summary-footer"
        style={{
          paddingHorizontal: 20,
          paddingTop: 12,
          paddingBottom: Math.max(12, insets.bottom),
          borderTopWidth: 1,
          borderColor: animePink.border,
          backgroundColor: animePink.background,
        }}
      >
        {footer}
      </View>
      <SectionStatusFade
        topInset={insets.top}
        lightIcons={status.style === 'light'}
      />
    </View>
  );
}
