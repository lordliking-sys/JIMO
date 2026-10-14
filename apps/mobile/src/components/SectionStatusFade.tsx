import { useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { animePink } from '@jimo/ui';

/** Decorative only: content stays below the safe area, artwork continues beneath it. */
export function SectionStatusFade({
  topInset,
  lightIcons,
}: {
  topInset: number;
  lightIcons: boolean;
}) {
  const id = `status-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  if (topInset <= 0) return null;
  const height = topInset + 28;
  const color = lightIcons ? animePink.surfaceDark : animePink.background;
  return (
    <View
      testID="section-status-fade"
      accessible={false}
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height,
        zIndex: 4,
      }}
    >
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <Stop
              offset="0"
              stopColor={color}
              stopOpacity={lightIcons ? 0.82 : 1}
            />
            <Stop
              offset={topInset / height}
              stopColor={color}
              stopOpacity={lightIcons ? 0.5 : 0.8}
            />
            <Stop offset="1" stopColor={color} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}
