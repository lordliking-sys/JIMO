import { StatusBar } from 'expo-status-bar';
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
import {
  useFocusEffect,
  useRouter,
  useIsFocused,
  type Href,
} from 'expo-router';
import { useCallback } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  SectionHeroScope,
  SectionHeroCanvas,
  SectionHeroFrame,
  useSectionStatusBar,
} from '../components/SectionHero';
import { Screen, Text, animePink } from '@jimo/ui';
import { useTranslation } from 'react-i18next';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import KeyboardIcon from 'lucide-react-native/icons/keyboard';
import { ink } from '../progress-profile/theme';
import { tabArtwork } from '../components/tab-artwork';
export const programInk = {
  ...ink,
  sage: animePink.primaryAction,
  background: animePink.background,
  surface: animePink.surface,
  field: animePink.surfaceSoft,
  text: animePink.textPrimary,
  secondary: animePink.textSecondary,
  border: animePink.border,
  primary: animePink.primaryAction,
  primaryText: animePink.white,
  danger: animePink.danger,
};
export const programArtwork = {
  programs: tabArtwork.program,
  day: tabArtwork.program,
  library: tabArtwork.program,
  custom: tabArtwork.program,
  structure: tabArtwork.program,
};
const Context = createContext(false);
export const ProgramPresentationProvider = Context.Provider;
const BackTarget = createContext<Href>('/program');
export const useProgramBackTarget = () => useContext(BackTarget);
export const useProgramPresentation = () => useContext(Context);
export function ProgramText({ style, ...props }: TextProps) {
  return (
    <NativeText
      {...props}
      style={[
        {
          fontFamily: 'Inter_600SemiBold',
          fontSize: 20,
          lineHeight: 26,
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
          minHeight: 54,
          paddingHorizontal: 14,
          paddingVertical: 12,
          justifyContent: 'center',
          alignItems: 'center',
          borderRadius: 18,
          borderWidth: variant === 'outline' ? 1 : 0,
          borderColor: programInk.primary,
          backgroundColor:
            variant === 'primary'
              ? programInk.primary
              : variant === 'outline' || variant === 'secondary'
                ? programInk.surface
                : 'transparent',
          opacity: disabled || busy ? 0.5 : pressed ? 0.75 : 1,
        },
        style,
      ]}
    >
      <Text
        variant="bodyMedium"
        color={
          variant === 'primary' ? programInk.primaryText : programInk.primary
        }
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
  cardTone?: 'light' | 'dark';
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
          <ProgramText style={{ fontSize: 17, lineHeight: 23 }}>
            {title}
          </ProgramText>
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
        <ChevronRight size={18} color={programInk.primary} />
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
  fallback = '/program',
}: {
  children: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
  background?: keyof typeof programArtwork;
  fallback?: Href;
}) {
  const { width } = useWindowDimensions(),
    [keyboard, setKeyboard] = useState(false),
    router = useRouter(),
    { t } = useTranslation('programs');
  const insets = useSafeAreaInsets(),
    focused = useIsFocused();
  const [heroHeight, setHeroHeight] = useState(180);
  const status = useSectionStatusBar(true, heroHeight + insets.top, insets.top);
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
        if (Keyboard.isVisible()) {
          Keyboard.dismiss();
          return true;
        }
        router.dismissTo(fallback);
        return true;
      });
      return () => sub.remove();
    }, [router, fallback]),
  );
  return (
    <Context.Provider value={true}>
      <BackTarget.Provider value={fallback}>
        <View
          testID="program-management-screen"
          style={{ flex: 1, backgroundColor: programInk.background }}
        >
          {focused ? <StatusBar style={status.style} /> : null}
          <Screen
            edgeToEdge
            onScroll={status.onScroll}
            keyboardAware
            surfaceStyle={{ backgroundColor: 'transparent' }}
            contentStyle={{
              paddingHorizontal: 0,
              paddingTop: insets.top,
              paddingBottom: 0,
              gap: 0,
            }}
            footerStyle={{
              backgroundColor: animePink.surface,
              borderTopWidth: 0,
              paddingLeft: insets.left + (width < 360 ? 16 : 20),
              paddingRight: insets.right + (width < 360 ? 16 : 20),
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
            <SectionHeroCanvas
              source={programArtwork[background]}
              width={width}
              topInset={insets.top}
              sideInset={insets.left + (width < 360 ? 16 : 20)}
              dark
              bodyColor={programInk.background}
            >
              <View
                style={{
                  paddingLeft: insets.left + (width < 360 ? 16 : 20),
                  paddingRight: insets.right + (width < 360 ? 16 : 20),
                }}
              >
                <SectionHeroFrame
                  compact
                  measured={setHeroHeight}
                  testID="program-management-hero"
                >
                  {header}
                </SectionHeroFrame>
              </View>
            </SectionHeroCanvas>
            <View
              testID="program-management-body"
              style={{
                backgroundColor: programInk.background,
                paddingLeft: insets.left + (width < 360 ? 16 : 20),
                paddingRight: insets.right + (width < 360 ? 16 : 20),
                paddingTop: 16,
                paddingBottom: 16,
                gap: 16,
              }}
            >
              {children}
            </View>
          </Screen>
        </View>
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
    borderRadius: 20,
    backgroundColor: programInk.surface,
    overflow: 'hidden',
  },
});
