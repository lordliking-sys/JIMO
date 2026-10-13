import { Text as NativeText, type TextProps } from 'react-native';
import { useFonts } from 'expo-font';
import { animePink } from '@jimo/ui';
export function HeroTitle({ style, ...props }: TextProps) {
  const [ready] = useFonts({
    AnimeHeroSerif: require('../../../assets/jimo/workout/fonts/CormorantGaramond.ttf'),
  });
  return (
    <NativeText
      {...props}
      style={[
        {
          fontFamily: ready ? 'AnimeHeroSerif' : 'serif',
          fontSize: 32,
          lineHeight: 36,
          color: animePink.white,
          letterSpacing: 0.2,
        },
        style,
      ]}
    />
  );
}
