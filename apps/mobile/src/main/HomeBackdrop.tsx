import { Image, StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Mask, Rect, Stop } from 'react-native-svg';
import { mainArtwork, mainInk } from './theme';

export function HomeBackdrop({
  width,
  topInset,
}: {
  width: number;
  topInset: number;
}) {
  const shadeHeight = Math.min(width, 560) * 0.7 + topInset + 24;
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: Math.round(width * 1.55),
      }}
    >
      <Image
        testID="home-background"
        source={mainArtwork.home}
        resizeMode="cover"
        accessible={false}
        style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]}
      />
      <Svg
        accessible={false}
        style={{ position: 'absolute', top: 0, left: 0, zIndex: 1 }}
        width={width}
        height={shadeHeight}
      >
        <Defs>
          <LinearGradient
            id="home-copy-shade"
            gradientUnits="userSpaceOnUse"
            x1={0}
            y1={0}
            x2={width}
            y2={0}
          >
            <Stop offset="0" stopColor={mainInk.ivory} stopOpacity={0.88} />
            <Stop offset="0.4" stopColor={mainInk.ivory} stopOpacity={0.7} />
            <Stop offset="0.7" stopColor={mainInk.ivory} stopOpacity={0} />
          </LinearGradient>
          <LinearGradient
            id="home-copy-fade"
            gradientUnits="userSpaceOnUse"
            x1={0}
            y1={0}
            x2={0}
            y2={shadeHeight}
          >
            <Stop offset="0" stopColor="white" />
            <Stop offset="0.55" stopColor="white" />
            <Stop offset="1" stopColor="white" stopOpacity={0} />
          </LinearGradient>
          <Mask
            id="home-copy-mask"
            maskUnits="userSpaceOnUse"
            maskType="alpha"
            x={0}
            y={0}
            width={width}
            height={shadeHeight}
          >
            <Rect
              width={width}
              height={shadeHeight}
              fill="url(#home-copy-fade)"
            />
          </Mask>
        </Defs>
        <Rect
          width={width}
          height={shadeHeight}
          fill="url(#home-copy-shade)"
          mask="url(#home-copy-mask)"
        />
      </Svg>
    </View>
  );
}
