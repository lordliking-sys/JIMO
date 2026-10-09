import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
  useId,
} from 'react';
import {
  BackHandler,
  Image,
  Keyboard,
  Pressable,
  StyleSheet,
  Text as NativeText,
  View,
  useWindowDimensions,
  type TextProps,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import { useFonts } from 'expo-font';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { Screen, Text, sizes } from '@jimo/ui';
import { useTranslation } from 'react-i18next';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import KeyboardIcon from 'lucide-react-native/icons/keyboard';
import { ink, artwork } from '../progress-profile/theme';
export { ink as programInk };
export const programArtwork = {
  programs: require('../../assets/jimo/program-management/programs-hero-bg.png'),
  day: require('../../assets/jimo/program-management/day-detail-bg.png'),
  library: require('../../assets/jimo/program-management/exercise-library-bg.png'),
  custom: require('../../assets/jimo/program-management/custom-exercise-bg.png'),
  structure: require('../../assets/jimo/program-management/program-structure-bg.png'),
};
const Context = createContext(false);
const Font = createContext(false);
const BackTarget = createContext<Href>('/program/manage');
export const useProgramBackTarget = () => useContext(BackTarget);
export const useProgramPresentation = () => useContext(Context);
export function ProgramText({ style, ...props }: TextProps) {
  const ready = useContext(Font);
  return (
    <NativeText
      {...props}
      style={[
        {
          fontFamily: ready ? 'JimoProgramSerif' : 'serif',
          fontSize: 24,
          lineHeight: 28,
          color: ink.charcoal,
        },
        style,
      ]}
    />
  );
}
export function ProgramButton({
  label,
  onPress,
  busy = false,
  disabled = false,
  variant = 'primary',
  style,
}: {
  label: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'outline' | 'secondary' | 'text';
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || busy, busy }}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [
        {
          minHeight: sizes.touch,
          paddingHorizontal: 14,
          paddingVertical: 12,
          justifyContent: 'center',
          alignItems: 'center',
          borderRadius: 8,
          borderWidth: variant === 'outline' ? 1 : 0,
          borderColor: ink.border,
          backgroundColor:
            variant === 'primary'
              ? ink.green
              : variant === 'outline'
                ? 'rgba(250,242,223,0.5)'
                : 'transparent',
          opacity: disabled || busy ? 0.5 : pressed ? 0.75 : 1,
        },
        style,
      ]}
    >
      <Text
        variant="bodyMedium"
        color={variant === 'primary' ? ink.paper : ink.charcoal}
        style={{ textAlign: 'center', fontSize: 14 }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
export function ProgramRow({
  title,
  subtitle,
  eyebrow,
  label,
  onPress,
  leading,
  trailing,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  label?: string;
  onPress: () => void;
  leading?: ReactNode;
  trailing?: ReactNode;
}) {
  return (
    <View style={presentationStyles.row}>
      {leading}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label ?? title}
        onPress={onPress}
        style={({ pressed }) => ({
          flex: 1,
          minWidth: 0,
          minHeight: 68,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          padding: 12,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
          {eyebrow ? (
            <Text variant="caption" color={ink.charcoal}>
              {eyebrow}
            </Text>
          ) : null}
          <ProgramText style={{ fontSize: 23 }}>{title}</ProgramText>
          {subtitle
            ? subtitle.split('\n').map((line, index) => (
                <Text key={index} variant="caption" color={ink.secondary}>
                  {line}
                </Text>
              ))
            : null}
        </View>
        <ChevronRight size={18} color={ink.secondary} />
      </Pressable>
      {trailing}
    </View>
  );
}
export function ProgramScreen({
  children,
  footer,
  background = 'programs',
  fallback = '/program/manage',
}: {
  children: ReactNode;
  footer?: ReactNode;
  background?: keyof typeof programArtwork;
  fallback?: Href;
}) {
  const [ready] = useFonts({
      JimoProgramSerif: require('../../assets/jimo/workout/fonts/CormorantGaramond.ttf'),
    }),
    { width } = useWindowDimensions(),
    [keyboard, setKeyboard] = useState(false),
    router = useRouter(),
    { t } = useTranslation('programs'),
    id = `program-bg-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  useEffect(() => {
    const a = Keyboard.addListener('keyboardDidShow', () => setKeyboard(true)),
      b = Keyboard.addListener('keyboardDidHide', () => setKeyboard(false));
    return () => {
      a.remove();
      b.remove();
    };
  }, []);
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (router.canGoBack()) return false;
        router.replace(fallback);
        return true;
      });
      return () => sub.remove();
    }, [router, fallback]),
  );
  const height =
    background === 'structure' ? 600 : background === 'day' ? 330 : 220;
  return (
    <Context.Provider value={true}>
      <BackTarget.Provider value={fallback}>
        <Font.Provider value={ready}>
          <View
            testID="program-management-screen"
            style={{ flex: 1, backgroundColor: ink.paper }}
          >
            <StatusBar style={background === 'day' ? 'light' : 'dark'} />
            <Image
              source={programArtwork[background]}
              accessible={false}
              resizeMode="cover"
              style={{
                position: 'absolute',
                top: 0,
                width: '100%',
                height,
                opacity:
                  background === 'structure'
                    ? 0.22
                    : background === 'day'
                      ? 1
                      : 0.72,
              }}
            />
            <Svg
              pointerEvents="none"
              accessible={false}
              width="100%"
              height={height}
              style={{ position: 'absolute', top: 0 }}
            >
              <Defs>
                <LinearGradient id={id} x1="0%" y1="0%" x2="0%" y2="100%">
                  {background === 'day' ? (
                    <>
                      <Stop
                        offset={0}
                        stopColor={ink.charcoal}
                        stopOpacity={0.82}
                      />
                      <Stop
                        offset={0.45}
                        stopColor={ink.charcoal}
                        stopOpacity={0.68}
                      />
                      <Stop
                        offset={0.8}
                        stopColor={ink.paper}
                        stopOpacity={0.88}
                      />
                    </>
                  ) : (
                    <>
                      <Stop
                        offset={0}
                        stopColor={ink.paper}
                        stopOpacity={0.24}
                      />
                      <Stop
                        offset={0.6}
                        stopColor={ink.paper}
                        stopOpacity={0.78}
                      />
                    </>
                  )}
                  <Stop offset={1} stopColor={ink.paper} stopOpacity={1} />
                </LinearGradient>
              </Defs>
              <Rect width="100%" height="100%" fill={`url(#${id})`} />
            </Svg>
            <Image
              source={artwork.paper}
              accessible={false}
              style={[
                StyleSheet.absoluteFill,
                { width: '100%', height: '100%', opacity: 0.18 },
              ]}
              resizeMode="cover"
            />
            <Screen
              keyboardAware
              surfaceStyle={{ backgroundColor: 'transparent' }}
              contentStyle={{
                paddingHorizontal: width < 360 ? 16 : 20,
                paddingVertical: 12,
                gap: 16,
              }}
              footerStyle={{
                backgroundColor: 'rgba(246,237,217,0.96)',
                borderTopWidth: 0,
                paddingHorizontal: width < 360 ? 16 : 20,
              }}
              {...(footer || keyboard
                ? {
                    footer: (
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        {keyboard ? (
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={t('keyboardDone')}
                            onPress={() => Keyboard.dismiss()}
                            style={{
                              width: 48,
                              height: 48,
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <KeyboardIcon color={ink.secondary} size={20} />
                          </Pressable>
                        ) : null}
                        <View style={{ flex: 1 }}>{footer}</View>
                      </View>
                    ),
                  }
                : {})}
            >
              {children}
            </Screen>
          </View>
        </Font.Provider>
      </BackTarget.Provider>
    </Context.Provider>
  );
}
export const presentationStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: ink.border,
    borderRadius: 8,
    backgroundColor: 'rgba(250,242,223,0.65)',
    overflow: 'hidden',
  },
});
