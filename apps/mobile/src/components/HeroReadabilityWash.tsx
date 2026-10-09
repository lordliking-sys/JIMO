import { useId } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';
import { ink } from '../progress-profile/theme';

/** Local mist/ink with fully transparent edges; never intercepts touches. */
export function HeroReadabilityWash({
  variant = 'light',
  testID,
}: {
  variant?: 'light' | 'dark';
  testID?: string;
}) {
  const id = `hero-wash-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const color = variant === 'light' ? ink.paper : ink.charcoal;
  const dark = variant === 'dark';
  return (
    <View
      testID={testID}
      pointerEvents="none"
      accessible={false}
      style={[StyleSheet.absoluteFill, { top: -20, bottom: -24 }]}
    >
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 400 200"
        preserveAspectRatio="none"
        accessible={false}
      >
        <Defs>
          <RadialGradient id={id} cx="48%" cy="48%" r="50%">
            <Stop
              offset={0}
              stopColor={color}
              stopOpacity={dark ? 0.8 : 0.98}
            />
            <Stop
              offset={0.55}
              stopColor={color}
              stopOpacity={dark ? 0.65 : 0.9}
            />
            <Stop
              offset={0.82}
              stopColor={color}
              stopOpacity={dark ? 0.25 : 0.5}
            />
            <Stop offset={1} stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Ellipse cx={200} cy={100} rx={200} ry={100} fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}
