import {
  createContext,
  memo,
  useContext,
  useId,
  useState,
  type ReactNode,
} from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
  type TextInputProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { Screen, Text, animePink } from '@jimo/ui';
import { Wordmark } from '../../components/Wordmark';
import { SectionStatusFade } from '../../components/SectionStatusFade';
import { loginAssets } from './assets';
import { loginGeometry } from './geometry';
import { LoginField } from './LoginField';

const sources = Object.fromEntries(
  Object.entries(loginAssets).map(([key, source]) => [
    key,
    typeof source === 'string' ? { uri: source } : source,
  ]),
) as typeof loginAssets;
const Geometry = createContext<ReturnType<typeof loginGeometry> | null>(null);
function useGeometry() {
  const value = useContext(Geometry);
  if (!value) throw new Error('Login geometry missing');
  return value;
}

const LoginBackground = memo(function LoginBackground({
  width,
  height,
}: {
  width: number;
  height: number;
}) {
  const id = `login-wash-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <View
      testID="login-background"
      pointerEvents="none"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      aria-hidden
      style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}
    >
      <Image
        source={sources.background}
        resizeMode="cover"
        accessible={false}
        style={{ position: 'absolute', top: 0, left: 0, width, height }}
      />
      <Svg width="100%" height="250" style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FFF7FA" stopOpacity={0.2} />
            <Stop offset="0.6" stopColor="#FFF7FA" stopOpacity={0.08} />
            <Stop offset="1" stopColor="#FFF7FA" stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="250" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
});

export function LoginEmail(props: TextInputProps & { label: string }) {
  const geometry = useGeometry(),
    [pillTop, setPillTop] = useState(28);
  return (
    <View
      testID="login-email-section"
      style={{ zIndex: 3, overflow: 'visible' }}
    >
      <LoginField
        {...props}
        onPillLayout={setPillTop}
        style={[props.style, { paddingRight: geometry.fairy.writeInset }]}
      />
      <View
        testID="login-fairy"
        pointerEvents="none"
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        aria-hidden
        style={{
          position: 'absolute',
          top: pillTop,
          left: 0,
          width: geometry.contentWidth,
          height: geometry.fieldHeight,
          overflow: 'visible',
        }}
      >
        <View
          testID="login-fairy-contact"
          style={{
            position: 'absolute',
            left: geometry.fairy.seatX - 12,
            top: -1,
            width: 24,
            height: 3,
            borderRadius: 12,
            backgroundColor: 'rgba(151,83,117,0.14)',
            shadowColor: '#AD7691',
            shadowOpacity: 0.12,
            shadowRadius: 6,
            shadowOffset: { width: 0, height: 2 },
          }}
        />
        <Image
          testID="login-fairy-image"
          source={sources.fairy}
          accessible={false}
          resizeMode="contain"
          style={{
            position: 'absolute',
            width: geometry.fairy.width,
            height: geometry.fairy.height,
            left: geometry.fairy.left,
            top: geometry.fairy.top,
            transform: [{ scaleX: -1 }],
          }}
        />
      </View>
    </View>
  );
}

function Lifter() {
  const geometry = useGeometry();
  return (
    <View
      testID="login-lifter-crop"
      pointerEvents="none"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      aria-hidden
      style={{ height: geometry.lifterHeight, overflow: 'hidden' }}
    >
      <Image
        testID="login-lifter-image"
        source={sources.lifter}
        resizeMode="contain"
        accessible={false}
        style={{
          position: 'absolute',
          width: geometry.lifter.width,
          height: geometry.lifter.height,
          top: geometry.lifter.top,
          left: geometry.lifter.left,
        }}
      />
      {geometry.lifter.contacts.map((x, index) => (
        <View
          key={index}
          testID={`login-hand-contact-${index}`}
          style={{
            position: 'absolute',
            top: 0,
            left: x - 14,
            width: 28,
            height: 3,
            borderRadius: 14,
            backgroundColor: 'rgba(156,69,108,0.12)',
            shadowColor: '#BB7094',
            shadowOpacity: 0.16,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 2 },
          }}
        />
      ))}
    </View>
  );
}

function LoginButton({
  label,
  onPress,
  busy,
  disabled,
}: {
  label: string;
  onPress(): void;
  busy: boolean;
  disabled: boolean;
}) {
  const reduced = useReducedMotion(),
    scale = useSharedValue(1),
    animation = useAnimatedStyle(
      () => ({ transform: [{ scale: scale.value }] }),
      [scale],
    ),
    id = `login-cta-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const animate = (next: number) => {
    scale.set(reduced ? 1 : withTiming(next, { duration: 120 }));
  };
  return (
    <Animated.View style={animation}>
      <Pressable
        testID="login-submit"
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: disabled || busy, busy }}
        aria-busy={busy}
        aria-disabled={disabled || busy}
        disabled={disabled || busy}
        onPress={onPress}
        onPressIn={() => animate(0.985)}
        onPressOut={() => animate(1)}
        style={({ pressed }) => ({
          minHeight: 56,
          borderRadius: 32,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 12,
          backgroundColor: animePink.primaryAction,
          opacity: disabled ? 0.55 : 1,
          shadowColor: '#EF5799',
          shadowOpacity: pressed ? 0.12 : 0.25,
          shadowRadius: pressed ? 8 : 14,
          shadowOffset: { width: 0, height: pressed ? 3 : 6 },
          elevation: pressed ? 2 : 4,
        })}
      >
        <View
          pointerEvents="none"
          accessible={false}
          style={[
            StyleSheet.absoluteFill,
            { borderRadius: 32, overflow: 'hidden' },
          ]}
        >
          <Svg width="100%" height="100%">
            <Defs>
              <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={animePink.primaryAction} />
                <Stop offset="1" stopColor="#C9286B" />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill={`url(#${id})`} />
          </Svg>
          <View
            style={{
              position: 'absolute',
              top: 1,
              left: 16,
              right: 16,
              height: 1,
              backgroundColor: 'rgba(255,255,255,0.28)',
            }}
          />
        </View>
        {busy ? (
          <ActivityIndicator color={animePink.white} />
        ) : (
          <Text
            variant="bodyMedium"
            style={{ fontSize: 18, lineHeight: 24, color: animePink.white }}
          >
            {label}
          </Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

export function LoginScreen({
  title,
  email,
  password,
  error,
  sessionAlert,
  submitLabel,
  submit,
  busy,
  loaded,
  onCreate,
  onForgot,
}: {
  title: string;
  email: ReactNode;
  password: ReactNode;
  error: ReactNode;
  sessionAlert: ReactNode;
  submitLabel: string;
  submit(): void;
  busy: boolean;
  loaded: boolean;
  onCreate(): void;
  onForgot(): void;
}) {
  const { t } = useTranslation('auth'),
    common = useTranslation('common').t,
    insets = useSafeAreaInsets(),
    { width, height, fontScale } = useWindowDimensions();
  // Keep the composition attached while Android's IME temporarily reduces the window height.
  const [baseline, setBaseline] = useState({ width, height });
  const compositionHeight =
    baseline.width === width ? Math.max(baseline.height, height) : height;
  if (baseline.width !== width || height > baseline.height)
    setBaseline({ width, height: compositionHeight });
  const geometry = loginGeometry(
    width - insets.left - insets.right,
    compositionHeight,
    insets.top,
    insets.bottom,
    fontScale,
    !!error,
  );
  return (
    <Geometry.Provider value={geometry}>
      <View
        testID="login-visual-screen"
        style={{ flex: 1, backgroundColor: animePink.background }}
      >
        <StatusBar style="dark" />
        <LoginBackground width={width} height={compositionHeight} />
        <Screen
          edgeToEdge
          bottomInset={false}
          keyboardAware
          dismissKeyboardLabel={t('keyboardDone')}
          surfaceStyle={{ backgroundColor: 'transparent' }}
          footerStyle={{ backgroundColor: 'rgba(255,247,250,0.92)' }}
          contentStyle={{
            padding: 0,
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
            gap: 0,
            maxWidth: '100%',
          }}
        >
          <View
            style={{ paddingLeft: insets.left, paddingRight: insets.right }}
          >
            <View
              testID="login-composition"
              style={{
                width: geometry.frameWidth,
                alignSelf: 'center',
                minHeight: geometry.contentHeight,
                paddingHorizontal: geometry.side,
                paddingTop: geometry.topPadding,
                paddingBottom: 12,
              }}
            >
              <View testID="login-header" style={{ gap: 4 }}>
                <Wordmark
                  asset={
                    <Text
                      accessible={false}
                      style={{
                        fontFamily: 'Inter_700Bold',
                        fontSize: geometry.headingFont,
                        lineHeight: geometry.headingLine,
                        letterSpacing: -1.5,
                        color: animePink.ink,
                      }}
                    >
                      {common('brand.name')}
                    </Text>
                  }
                />
                <Text
                  style={{
                    color: animePink.ink,
                    fontSize: 14,
                    lineHeight: 22,
                  }}
                >
                  {t('tagline')}
                </Text>
                <Text
                  accessibilityRole="header"
                  style={{
                    marginTop: 10,
                    fontFamily: 'Inter_700Bold',
                    fontSize: geometry.headingFont,
                    lineHeight: geometry.headingLine,
                    letterSpacing: -1.2,
                    color: animePink.ink,
                  }}
                >
                  {title}
                </Text>
              </View>
              <View style={{ height: geometry.emailGap }} />
              {sessionAlert ? (
                <View style={{ marginBottom: 20 }}>{sessionAlert}</View>
              ) : (
                <>
                  {email}
                  <View
                    testID="login-password-section"
                    style={{ marginTop: 20, zIndex: 2 }}
                  >
                    {password}
                  </View>
                  <Lifter />
                </>
              )}
              <View style={{ flexGrow: 1 }} />
              {error ? (
                <View
                  testID="login-error"
                  style={{
                    marginBottom: 8,
                    padding: 10,
                    borderRadius: 14,
                    backgroundColor: 'rgba(255,247,250,0.88)',
                  }}
                >
                  {error}
                </View>
              ) : null}
              <LoginButton
                label={submitLabel}
                busy={busy}
                disabled={!loaded}
                onPress={submit}
              />
              <View
                testID="login-secondary-links"
                style={{
                  flexDirection: 'row',
                  minHeight: 56,
                  alignItems: 'center',
                  borderRadius: 24,
                  backgroundColor: 'rgba(255,247,250,0.38)',
                }}
              >
                {[
                  { label: t('signUp'), action: onCreate, flex: 2 },
                  { label: t('forgotPassword'), action: onForgot, flex: 3 },
                ].map(({ label, action, flex }) => (
                  <Pressable
                    key={label}
                    accessibilityRole="button"
                    accessibilityLabel={label}
                    disabled={busy}
                    accessibilityState={{ disabled: busy }}
                    onPress={action}
                    style={{
                      flex,
                      minHeight: 48,
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingVertical: 8,
                      paddingHorizontal: 4,
                      opacity: busy ? 0.55 : 1,
                    }}
                  >
                    <Text
                      variant="bodyMedium"
                      style={{
                        color: animePink.primaryText,
                        fontSize: 14,
                        lineHeight: 20,
                        textAlign: 'center',
                      }}
                    >
                      {label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        </Screen>
        <SectionStatusFade topInset={insets.top} lightIcons={false} />
      </View>
    </Geometry.Provider>
  );
}
