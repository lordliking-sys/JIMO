import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { hideAsync } from 'expo-splash-screen';
import Animated, {
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { colors, spacing, Text } from '@jimo/ui';
import { useTranslation } from 'react-i18next';
import { Wordmark } from './Wordmark';
export function BrandTransition({
  onComplete,
  returning,
}: {
  onComplete: () => void;
  returning: boolean;
}) {
  const { t } = useTranslation();
  const reducedMotion = useReducedMotion();
  const opacity = useSharedValue(reducedMotion ? 1 : 0);
  const scale = useSharedValue(reducedMotion ? 1 : 0.97);
  useEffect(() => {
    if (reducedMotion) {
      const timer = setTimeout(onComplete, 30);
      return () => clearTimeout(timer);
    }
    scale.value = withTiming(1, { duration: 240 });
    opacity.value = withSequence(
      withTiming(1, { duration: 220 }),
      withDelay(
        returning ? 480 : 650,
        withTiming(0, { duration: 200 }, (finished) => {
          if (finished) runOnJS(onComplete)();
        }),
      ),
    );
    return () => {
      cancelAnimation(opacity);
      cancelAnimation(scale);
    };
  }, [onComplete, opacity, reducedMotion, returning, scale]);
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));
  return (
    <Animated.View
      testID="brand-transition"
      style={styles.overlay}
      onLayout={() => {
        void hideAsync();
      }}
    >
      <Animated.View style={[styles.brand, animatedStyle]}>
        <Wordmark />
        <Text color={colors.secondary}>{t('brand.tagline')}</Text>
      </Animated.View>
    </Animated.View>
  );
}
const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
  },
  brand: { alignItems: 'center', gap: spacing.md },
});
