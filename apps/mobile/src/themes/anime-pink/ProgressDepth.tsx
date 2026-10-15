import {
  Image,
  StyleSheet,
  View,
  type ImageSourcePropType,
} from 'react-native';
import Svg, {
  Defs,
  Image as SvgImage,
  Mask,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import { useId } from 'react';
import { heroArtworkFrame } from './artwork-geometry';

/** The original is a flattened illustration: soft code-only masks preserve its pixels and crop. */
export function ProgressDepth({
  source,
  size,
}: {
  source: ImageSourcePropType;
  size: { width: number; height: number };
}) {
  const id = `depth-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const frame = heroArtworkFrame('progress', size);
  return (
    <View
      testID="progress-artwork-depth"
      pointerEvents="none"
      accessible={false}
      style={StyleSheet.absoluteFill}
    >
      <Image
        source={typeof source === 'string' ? { uri: source } : source}
        blurRadius={3}
        resizeMode="cover"
        accessible={false}
        style={{ position: 'absolute', ...frame }}
      />
      <Svg
        width={frame.width}
        height={frame.height}
        viewBox="0 0 1469 1071"
        style={{ position: 'absolute', left: frame.left, top: frame.top }}
      >
        <Defs>
          <RadialGradient
            id={`${id}-shadow`}
            cx="75%"
            cy="46%"
            rx="36%"
            ry="62%"
          >
            <Stop offset="0" stopColor="#150D1C" stopOpacity={0.3} />
            <Stop offset="0.8" stopColor="#150D1C" stopOpacity={0.12} />
            <Stop offset="1" stopColor="#150D1C" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id={`${id}-haze`} cx="76%" cy="43%" rx="36%" ry="64%">
            <Stop offset="0.5" stopColor="#FF9AB9" stopOpacity={0} />
            <Stop offset="0.79" stopColor="#FF9AB9" stopOpacity={0.13} />
            <Stop offset="1" stopColor="#FF9AB9" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient
            id={`${id}-subject`}
            cx="78%"
            cy="43%"
            rx="38%"
            ry="65%"
          >
            <Stop offset="0" stopColor="white" />
            <Stop offset="0.68" stopColor="white" />
            <Stop offset="0.94" stopColor="white" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id={`${id}-legs`} cx="48%" cy="82%" rx="48%" ry="28%">
            <Stop offset="0" stopColor="white" />
            <Stop offset="0.6" stopColor="white" />
            <Stop offset="1" stopColor="white" stopOpacity={0} />
          </RadialGradient>
          <Mask
            id={`${id}-focus`}
            x="0"
            y="0"
            width="1469"
            height="1071"
            maskUnits="userSpaceOnUse"
          >
            <Rect width="1469" height="1071" fill={`url(#${id}-subject)`} />
            <Rect width="1469" height="1071" fill={`url(#${id}-legs)`} />
          </Mask>
        </Defs>
        <Rect width="1469" height="1071" fill={`url(#${id}-shadow)`} />
        <Rect width="1469" height="1071" fill={`url(#${id}-haze)`} />
        <SvgImage
          testID="progress-focused-original"
          href={source}
          width="1469"
          height="1071"
          preserveAspectRatio="xMidYMid meet"
          mask={`url(#${id}-focus)`}
        />
      </Svg>
    </View>
  );
}
