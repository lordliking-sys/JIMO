import { useId } from 'react';
import {
  Image,
  StyleSheet,
  View,
  type ImageSourcePropType,
} from 'react-native';
import Svg, {
  Defs,
  LinearGradient,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import { animePink } from '@jimo/ui';
/** Real artwork slot. Its code-only placeholder keeps the final composition without inventing a character. */
export function ThemeArtwork({
  source,
  dark = true,
  testID = 'theme-artwork',
  bodyColor,
}: {
  source?: ImageSourcePropType | null | undefined;
  dark?: boolean;
  testID?: string;
  bodyColor?: string;
}) {
  const id = `anime-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <View
      testID={testID}
      pointerEvents="none"
      accessible={false}
      style={[
        StyleSheet.absoluteFill,
        { overflow: 'hidden', backgroundColor: animePink.surfaceDark },
      ]}
    >
      {source ? (
        <Image
          testID={`${testID}-image`}
          source={source}
          resizeMode="cover"
          accessible={false}
          style={{ width: '100%', height: '100%' }}
        />
      ) : (
        <Svg
          testID={`${testID}-placeholder`}
          width="100%"
          height="100%"
          preserveAspectRatio="none"
        >
          <Defs>
            <LinearGradient id={`${id}-base`} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#17131E" />
              <Stop offset="0.55" stopColor="#4C203B" />
              <Stop offset="1" stopColor="#241722" />
            </LinearGradient>
            <RadialGradient id={`${id}-glow`} cx="83%" cy="24%" r="80%">
              <Stop
                offset="0"
                stopColor={animePink.primaryPink}
                stopOpacity="0.55"
              />
              <Stop
                offset="0.58"
                stopColor={animePink.magenta}
                stopOpacity="0.17"
              />
              <Stop offset="1" stopColor={animePink.magenta} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Rect width="100%" height="100%" fill={`url(#${id}-base)`} />
          <Rect width="100%" height="100%" fill={`url(#${id}-glow)`} />
        </Svg>
      )}
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={`${id}-shade`} x1="0" y1="0" x2="0" y2="1">
            <Stop
              offset="0"
              stopColor={animePink.surfaceDark}
              stopOpacity="0.35"
            />
            <Stop
              offset="0.5"
              stopColor={animePink.surfaceDark}
              stopOpacity="0.05"
            />
            <Stop
              offset="0.97"
              stopColor={animePink.surfaceDark}
              stopOpacity={dark ? 0.48 : 0.2}
            />
            <Stop
              offset="1"
              stopColor={bodyColor ?? animePink.surfaceDark}
              stopOpacity={bodyColor ? 1 : 0.5}
            />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id}-shade)`} />
      </Svg>
    </View>
  );
}
