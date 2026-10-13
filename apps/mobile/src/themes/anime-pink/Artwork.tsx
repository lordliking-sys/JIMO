import { useId, useState } from 'react';
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
import { animePinkAssets } from './assets';
import { heroArtworkFrame, type ArtworkScene } from './artwork-geometry';
/** Real artwork slot. Its code-only placeholder keeps the final composition without inventing a character. */
export function ThemeArtwork({
  source,
  dark = true,
  testID = 'theme-artwork',
  bodyColor,
  size,
}: {
  source?: ImageSourcePropType | null | undefined;
  dark?: boolean;
  testID?: string;
  bodyColor?: string;
  size?: { width: number; height: number };
}) {
  const id = `anime-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const [measured, setMeasured] = useState({ width: 0, height: 0 });
  const scenes: ArtworkScene[] = ['home', 'program', 'progress', 'profile'];
  const scene = source
    ? scenes.find((key) => animePinkAssets[`${key}.hero`] === source)
    : undefined;
  const dimensions = size ?? measured;
  const frame =
    scene && dimensions.width > 0 && dimensions.height > 0
      ? heroArtworkFrame(scene, dimensions)
      : null;
  const shadeStops = [
    { offset: 0, opacity: scene ? 0.66 : 0.35, color: animePink.surfaceDark },
    { offset: scene ? 0.3 : 0.5, opacity: 0.05, color: animePink.surfaceDark },
    ...(scene
      ? [
          { offset: 0.45, opacity: 0.05, color: animePink.surfaceDark },
          {
            offset: 0.55,
            opacity: scene === 'home' ? 0.62 : 0.08,
            color: animePink.surfaceDark,
          },
        ]
      : []),
    {
      offset: 0.97,
      opacity: scene === 'home' ? 0.8 : dark ? 0.48 : 0.2,
      color: animePink.surfaceDark,
    },
    {
      offset: 1,
      opacity: bodyColor ? 1 : 0.5,
      color: bodyColor ?? animePink.surfaceDark,
    },
  ];
  return (
    <View
      testID={testID}
      pointerEvents="none"
      accessible={false}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setMeasured((current) =>
          current.width === width && current.height === height
            ? current
            : { width, height },
        );
      }}
      style={[
        StyleSheet.absoluteFill,
        { overflow: 'hidden', backgroundColor: animePink.surfaceDark },
      ]}
    >
      {source ? (
        <Image
          testID={`${testID}-image`}
          source={typeof source === 'string' ? { uri: source } : source}
          resizeMode="cover"
          accessible={false}
          style={
            frame
              ? { position: 'absolute', ...frame }
              : { width: '100%', height: '100%' }
          }
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
        {scene === 'profile' ? (
          <Rect width="100%" height="100%" fill="#352044" opacity={0.22} />
        ) : null}
        <Defs>
          <LinearGradient id={`${id}-shade`} x1="0" y1="0" x2="0" y2="1">
            {shadeStops.map((stop) => (
              <Stop
                key={stop.offset}
                offset={stop.offset}
                stopColor={stop.color}
                stopOpacity={stop.opacity}
              />
            ))}
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id}-shade)`} />
      </Svg>
    </View>
  );
}
