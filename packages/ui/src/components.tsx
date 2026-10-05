import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text as NativeText,
  View,
} from 'react-native';
import type { StyleProp, TextProps, ViewProps, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, sizes, spacing, typography } from './tokens';
import type { TextVariant } from './tokens';

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
}: {
  children: ReactNode;
  bottomInset?: boolean;
}) {
  return (
    <SafeAreaView
      style={styles.screen}
      edges={
        bottomInset
          ? ['top', 'bottom', 'left', 'right']
          : ['top', 'left', 'right']
      }
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
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
          backgroundColor: primary ? colors.primary : colors.elevated,
          opacity: disabled ? 0.55 : pressed ? 0.8 : 1,
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
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: sizes.content,
    alignSelf: 'center',
    padding: spacing.xxl,
    gap: spacing.xxl,
  },
  button: {
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
