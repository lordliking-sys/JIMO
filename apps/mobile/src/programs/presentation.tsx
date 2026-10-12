import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  BackHandler,
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  SectionHeroScope,
  SectionHeroArtwork,
  SectionHeroFrame,
} from '../components/SectionHero';
import { programHeroHeight } from '../components/section-hero-geometry';
import { Screen, Text, sizes } from '@jimo/ui';
import { useTranslation } from 'react-i18next';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import KeyboardIcon from 'lucide-react-native/icons/keyboard';
import { ink } from '../progress-profile/theme';
import { tabArtwork } from '../components/tab-artwork';
export const programInk = {
  ...ink,
  background: ink.charcoal,
  surface: 'rgba(16, 19, 15, 0.82)',
  field: 'rgba(16, 19, 15, 0.72)',
  text: ink.paper,
  secondary: '#bcb8ab',
  border: 'rgba(183, 198, 155, 0.28)',
  primary: ink.sage,
  primaryText: ink.charcoal,
  danger: '#ffb4a8',
};
export const programArtwork = {
  programs: tabArtwork.program,
  day: tabArtwork.program,
  library: tabArtwork.program,
  custom: tabArtwork.program,
  structure: tabArtwork.program,
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
          color: programInk.text,
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
          borderRadius: 18,
          borderWidth: variant === 'outline' ? 1 : 0,
          borderColor: programInk.border,
          backgroundColor:
            variant === 'primary'
              ? programInk.primary
              : variant === 'outline'
                ? programInk.surface
                : 'transparent',
          opacity: disabled || busy ? 0.5 : pressed ? 0.75 : 1,
        },
        style,
      ]}
    >
      <Text
        variant="bodyMedium"
        color={variant === 'primary' ? programInk.primaryText : programInk.text}
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
          paddingHorizontal: 12,
          paddingVertical: leading ? 8 : 12,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        {leading}
        <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
          {eyebrow ? (
            <Text variant="caption" color={programInk.text}>
              {eyebrow}
            </Text>
          ) : null}
          <ProgramText style={{ fontSize: 23 }}>{title}</ProgramText>
          {subtitle
            ? subtitle.split('\n').map((line, index) => (
                <Text
                  key={index}
                  variant="caption"
                  color={programInk.secondary}
                >
                  {line}
                </Text>
              ))
            : null}
        </View>
        <ChevronRight size={18} color={programInk.secondary} />
      </Pressable>
      {trailing}
    </View>
  );
}
function ProgramSurface({
  children,
  header,
  footer,
  background = 'programs',
  fallback = '/program/manage',
}: {
  children: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
  background?: keyof typeof programArtwork;
  fallback?: Href;
}) {
  const [ready] = useFonts({
      JimoProgramSerif: require('../../assets/jimo/workout/fonts/CormorantGaramond.ttf'),
    }),
    { width, fontScale } = useWindowDimensions(),
    [keyboard, setKeyboard] = useState(false),
    router = useRouter(),
    { t } = useTranslation('programs');
  const insets = useSafeAreaInsets(),
    key = `${width}:${fontScale}`;
  const [measured, setMeasured] = useState({ key, height: 0 });
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
    Math.max(
      programHeroHeight(width, fontScale),
      measured.key === key ? measured.height : 0,
    ) + insets.top;
  return (
    <Context.Provider value={true}>
      <BackTarget.Provider value={fallback}>
        <Font.Provider value={ready}>
          <View
            testID="program-management-screen"
            style={{ flex: 1, backgroundColor: programInk.background }}
          >
            <StatusBar style="light" />
            <SectionHeroArtwork
              source={programArtwork[background]}
              width={width}
              height={height}
              dark
              bodyColor={programInk.background}
            />
            <Screen
              keyboardAware
              surfaceStyle={{ backgroundColor: 'transparent' }}
              contentStyle={{
                paddingHorizontal: 0,
                paddingVertical: 0,
                gap: 0,
              }}
              footerStyle={{
                backgroundColor: 'rgba(16,19,15,0.96)',
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
                            <KeyboardIcon
                              color={programInk.secondary}
                              size={20}
                            />
                          </Pressable>
                        ) : null}
                        <View style={{ flex: 1 }}>{footer}</View>
                      </View>
                    ),
                  }
                : {})}
            >
              <View style={{ paddingHorizontal: width < 360 ? 16 : 20 }}>
                <SectionHeroFrame
                  compact
                  testID="program-management-hero"
                  measured={(next) =>
                    setMeasured((old) =>
                      old.key === key && Math.abs(old.height - next) <= 1
                        ? old
                        : { key, height: next },
                    )
                  }
                >
                  {header}
                </SectionHeroFrame>
              </View>
              <View
                testID="program-management-body"
                style={{
                  backgroundColor: programInk.background,
                  paddingHorizontal: width < 360 ? 16 : 20,
                  paddingTop: 16,
                  paddingBottom: 16,
                  gap: 16,
                }}
              >
                {children}
              </View>
            </Screen>
          </View>
        </Font.Provider>
      </BackTarget.Provider>
    </Context.Provider>
  );
}
export function ProgramScreen(props: {
  children: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
  background?: keyof typeof programArtwork;
  fallback?: Href;
}) {
  return (
    <SectionHeroScope>
      <ProgramSurface {...props} />
    </SectionHeroScope>
  );
}
export const presentationStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: programInk.border,
    borderRadius: 24,
    backgroundColor: programInk.surface,
    overflow: 'hidden',
  },
});
