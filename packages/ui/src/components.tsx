import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
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
import { colors, radius, sizes, spacing, typography } from './tokens';
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
  keyboardAware = false,
  footer,
  dismissKeyboardLabel,
  contentStyle,
}: {
  children: ReactNode;
  bottomInset?: boolean;
  keyboardAware?: boolean;
  footer?: ReactNode;
  dismissKeyboardLabel?: string;
  contentStyle?: StyleProp<ViewStyle>;
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
      style={styles.screen}
      edges={
        bottomInset
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
              }}
              scrollEventThrottle={16}
            >
              {children}
            </ScrollView>
          </View>
          {footer || (keyboardVisible && dismissKeyboardLabel) ? (
            <View style={styles.footer}>
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
};
export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  busy = false,
  style,
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
          opacity: disabled ? 0.55 : pressed ? 0.8 : 1,
        },
        variant === 'text' && {
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.sm,
          alignSelf: 'flex-start',
        },
        style,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={primary ? colors.background : colors.text} />
      ) : (
        <Text
          variant="bodyMedium"
          color={primary ? colors.background : colors.text}
          style={styles.center}
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
    minHeight: sizes.touch,
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
