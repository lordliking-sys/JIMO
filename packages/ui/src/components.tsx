import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useId,
} from 'react';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text as NativeText,
  View,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import type {
  StyleProp,
  TextInput,
  TextProps,
  ViewProps,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, {
  Defs,
  LinearGradient,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import {
  animePink,
  colors,
  radius,
  sizes,
  spacing,
  typography,
  uiDepth,
} from './tokens';
import type { TextVariant } from './tokens';
import { scrollToReveal } from './keyboard';

const FormFocusContext = createContext<(input: TextInput | null) => void>(
  () => {},
);
export const useFormFocus = () => useContext(FormFocusContext);

export function Text({
  variant = 'body',
  color = colors.text,
  style,
  ...props
}: TextProps & { variant?: TextVariant; color?: string }) {
  return (
    <NativeText {...props} style={[typography[variant], { color }, style]} />
  );
}
export function Screen({
  children,
  bottomInset = true,
  edgeToEdge = false,
  onScroll,
  keyboardAware = false,
  footer,
  dismissKeyboardLabel,
  contentStyle,
  surfaceStyle,
  footerStyle,
}: {
  children: ReactNode;
  bottomInset?: boolean;
  edgeToEdge?: boolean;
  onScroll?: React.ComponentProps<typeof ScrollView>['onScroll'];
  keyboardAware?: boolean;
  footer?: ReactNode;
  dismissKeyboardLabel?: string;
  contentStyle?: StyleProp<ViewStyle>;
  surfaceStyle?: StyleProp<ViewStyle>;
  footerStyle?: StyleProp<ViewStyle>;
}) {
  const { width, height } = useWindowDimensions();
  const scroll = useRef<ScrollView>(null);
  const viewport = useRef<View>(null);
  const focused = useRef<TextInput | null>(null);
  const offset = useRef(0);
  const keyboardTop = useRef(Number.POSITIVE_INFINITY);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const reveal = useCallback(() => {
    if (!keyboardAware || !focused.current || !scroll.current) return;
    viewport.current?.measureInWindow((_x, top, _width, height) => {
      focused.current?.measureInWindow(
        (_inputX, fieldTop, _inputWidth, fieldHeight) => {
          const next = scrollToReveal({
            fieldTop,
            fieldHeight,
            viewportTop: top,
            viewportBottom: Math.min(top + height, keyboardTop.current),
            offset: offset.current,
          });
          if (Math.abs(next - offset.current) > 1)
            scroll.current?.scrollTo({ y: next, animated: false });
        },
      );
    });
  }, [keyboardAware]);
  // Width changes can wrap headings after the first layout measurement.
  // Reveal again once the resized form has finished laying out.
  useEffect(() => {
    if (!keyboardAware) return;
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(reveal);
    });
    return () => cancelAnimationFrame(frame);
  }, [width, height, keyboardAware, reveal]);
  const focus = useCallback(
    (input: TextInput | null) => {
      focused.current = input;
      requestAnimationFrame(reveal);
    },
    [reveal],
  );
  useEffect(() => {
    if (!keyboardAware) return;
    const shown = Keyboard.addListener('keyboardDidShow', (event) => {
      keyboardTop.current = event.endCoordinates.screenY;
      setKeyboardVisible(true);
      requestAnimationFrame(reveal);
    });
    const changed = Keyboard.addListener('keyboardWillChangeFrame', (event) => {
      keyboardTop.current = event.endCoordinates.screenY;
      requestAnimationFrame(reveal);
    });
    const hidden = Keyboard.addListener('keyboardDidHide', () => {
      keyboardTop.current = Number.POSITIVE_INFINITY;
      setKeyboardVisible(false);
    });
    return () => {
      shown.remove();
      changed.remove();
      hidden.remove();
    };
  }, [keyboardAware, reveal]);
  return (
    <SafeAreaView
      style={[styles.screen, surfaceStyle]}
      edges={
        edgeToEdge
          ? bottomInset
            ? ['bottom']
            : []
          : bottomInset
            ? ['top', 'bottom', 'left', 'right']
            : ['top', 'left', 'right']
      }
    >
      <FormFocusContext.Provider value={focus}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          enabled={keyboardAware}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View
            ref={viewport}
            style={{ flex: 1 }}
            onLayout={() => requestAnimationFrame(reveal)}
          >
            <ScrollView
              ref={scroll}
              contentContainerStyle={[styles.content, contentStyle]}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={
                Platform.OS === 'web'
                  ? 'none'
                  : Platform.OS === 'ios'
                    ? 'interactive'
                    : 'on-drag'
              }
              onLayout={() => requestAnimationFrame(reveal)}
              onContentSizeChange={() => requestAnimationFrame(reveal)}
              onScroll={(event) => {
                offset.current = event.nativeEvent.contentOffset.y;
                onScroll?.(event);
              }}
              scrollEventThrottle={16}
            >
              {children}
            </ScrollView>
          </View>
          {footer || (keyboardVisible && dismissKeyboardLabel) ? (
            <View style={[styles.footer, footerStyle]}>
              {keyboardVisible && dismissKeyboardLabel ? (
                <Button
                  label={dismissKeyboardLabel}
                  variant="secondary"
                  onPress={() => Keyboard.dismiss()}
                />
              ) : null}
              {footer ? <View style={{ flex: 1 }}>{footer}</View> : null}
            </View>
          ) : null}
        </KeyboardAvoidingView>
      </FormFocusContext.Provider>
    </SafeAreaView>
  );
}
type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'text';
  disabled?: boolean;
  busy?: boolean;
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<import('react-native').TextStyle>;
};
/** Code-only top light. It never intercepts taps or adds an accessibility element. */
export function SoftHighlight({
  radius: corner = 18,
  variant = 'light',
}: {
  radius?: number;
  variant?: 'primary' | 'light' | 'dark';
}) {
  const id = `surface-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <View
      pointerEvents="none"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      aria-hidden
      style={[
        StyleSheet.absoluteFill,
        { borderRadius: corner, overflow: 'hidden' },
      ]}
    >
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            {(variant === 'primary'
              ? [
                  { offset: 0, color: '#EE6BA3', opacity: 1 },
                  { offset: 0.2, color: '#E13A7E', opacity: 1 },
                  { offset: 0.5, color: animePink.primaryAction, opacity: 1 },
                  { offset: 0.78, color: '#C41E62', opacity: 1 },
                  { offset: 1, color: '#A71751', opacity: 1 },
                ]
              : [
                  {
                    offset: 0,
                    color: '#FFFFFF',
                    opacity: variant === 'dark' ? 0.18 : 0.65,
                  },
                  { offset: 0.28, color: '#FFFFFF', opacity: 0.06 },
                  { offset: 0.75, color: '#FFFFFF', opacity: 0 },
                  { offset: 1, color: '#C65B8B', opacity: 0.05 },
                ]
            ).map((stop) => (
              <Stop
                key={stop.offset}
                offset={stop.offset}
                stopColor={stop.color}
                stopOpacity={stop.opacity}
              />
            ))}
          </LinearGradient>
          <RadialGradient id={`${id}-gloss`} cx="50%" cy="0%" rx="70%" ry="65%">
            <Stop
              offset="0"
              stopColor="#FFFFFF"
              stopOpacity={variant === 'primary' ? 0.48 : 0.3}
            />
            <Stop offset="0.32" stopColor="#FFFFFF" stopOpacity={0.18} />
            <Stop offset="0.72" stopColor="#FFFFFF" stopOpacity={0.02} />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id})`} />
        {variant !== 'dark' ? (
          <Rect width="100%" height="100%" fill={`url(#${id}-gloss)`} />
        ) : null}
      </Svg>
      <View
        style={{
          position: 'absolute',
          top: 1.5,
          bottom: 1.5,
          left: 1.5,
          right: 1.5,
          borderRadius: Math.max(0, corner - 1.5),
          borderTopWidth: 1.5,
          borderBottomWidth: variant === 'primary' ? 2 : 1,
          borderLeftWidth: 0.5,
          borderRightWidth: 0.5,
          borderColor: 'rgba(255,255,255,0.18)',
          borderTopColor: 'rgba(255,255,255,0.65)',
          borderBottomColor:
            variant === 'primary'
              ? 'rgba(114,12,53,0.3)'
              : 'rgba(193,100,142,0.1)',
        }}
      />
    </View>
  );
}
export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  busy = false,
  style,
  labelStyle,
}: ButtonProps) {
  const primary = variant === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || busy, busy }}
      aria-busy={busy}
      aria-disabled={disabled || busy}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: primary
            ? colors.primary
            : variant === 'text'
              ? 'transparent'
              : colors.elevated,
          opacity: disabled ? 0.55 : pressed ? 0.9 : 1,
        },
        primary && uiDepth.action,
        primary && { borderWidth: 1, borderColor: 'rgba(182,28,92,0.22)' },
        primary &&
          pressed && {
            shadowOpacity: 0.12,
            shadowOffset: { width: 0, height: 2 },
            elevation: 1,
          },
        variant === 'secondary' && {
          borderWidth: 1,
          borderColor: colors.primary,
          shadowColor: '#B6517E',
          shadowOpacity: pressed ? 0.03 : 0.08,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: pressed ? 1 : 3 },
          elevation: pressed ? 1 : 2,
        },
        variant === 'text' && {
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.sm,
          alignSelf: 'flex-start',
        },
        style,
      ]}
    >
      {variant !== 'text' ? (
        <SoftHighlight
          variant={primary ? 'primary' : 'light'}
          radius={
            Number(StyleSheet.flatten([styles.button, style]).borderRadius) ||
            18
          }
        />
      ) : null}
      {busy ? (
        <ActivityIndicator color={primary ? animePink.white : colors.primary} />
      ) : (
        <Text
          variant="bodyMedium"
          color={primary ? animePink.white : colors.primary}
          style={[styles.center, labelStyle]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}
export function Card({ children, style, ...props }: ViewProps) {
  return (
    <View {...props} style={[styles.card, style]}>
      {children}
    </View>
  );
}
export function IconButton({
  icon,
  label,
  onPress,
  disabled = false,
}: {
  icon: ReactNode;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [
        styles.iconButton,
        { opacity: disabled ? 0.4 : pressed ? 0.7 : 1 },
      ]}
    >
      {icon}
    </Pressable>
  );
}
export function Divider() {
  return <View style={styles.divider} />;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  footer: {
    width: '100%',
    maxWidth: sizes.content,
    alignSelf: 'center',
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: sizes.content,
    alignSelf: 'center',
    padding: spacing.xxl,
    gap: spacing.xxl,
  },
  button: {
    minWidth: sizes.touch,
    minHeight: 54,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: { textAlign: 'center' },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.large,
    padding: spacing.xl,
    gap: spacing.lg,
    ...uiDepth.card,
  },
  iconButton: {
    width: sizes.touch,
    minHeight: sizes.touch,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.medium,
  },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
});
