import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  TextInput,
  StyleSheet,
  View,
  Modal,
  Platform,
  useWindowDimensions,
} from 'react-native';
import type { TextInputProps } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Card,
  Screen,
  Text,
  colors,
  spacing,
  radius,
  sizes,
  useFormFocus,
  IconButton,
} from '@jimo/ui';
import { ApiClientError } from '../api/client';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import EllipsisVertical from 'lucide-react-native/icons/ellipsis-vertical';
import {
  ProgramScreen,
  ProgramText,
  ProgramButton,
  useProgramPresentation,
  useProgramBackTarget,
  programInk,
  type programArtwork,
} from './presentation';
import { HeroReadabilityWash } from '../components/HeroReadabilityWash';
/** Form sections use hierarchy and dividers instead of nested surfaces. */
export function FormSection({ children }: { children: ReactNode }) {
  const visual = useProgramPresentation();
  return (
    <View
      style={{
        gap: spacing.lg,
        paddingTop: visual ? 0 : spacing.lg,
        borderTopWidth: visual ? 0 : StyleSheet.hairlineWidth,
        borderTopColor: visual ? programInk.border : colors.border,
      }}
    >
      {children}
    </View>
  );
}
export function FormScreen({
  children,
  footer,
  invalid = false,
  presentation = false,
  background = 'programs',
  fallback,
}: {
  children: ReactNode;
  footer?: ReactNode;
  invalid?: boolean;
  presentation?: boolean;
  background?: keyof typeof programArtwork;
  fallback?: Href;
}) {
  const { t } = useTranslation('programs');
  if (presentation)
    return (
      <ProgramScreen
        background={background}
        {...(fallback ? { fallback } : {})}
        {...(footer ? { footer } : {})}
      >
        {children}
        {invalid ? (
          <Text
            variant="caption"
            color={programInk.danger}
            accessibilityRole="alert"
          >
            {t('invalidForm')}
          </Text>
        ) : null}
      </ProgramScreen>
    );
  return (
    <Screen
      keyboardAware
      contentStyle={{ padding: spacing.lg, gap: spacing.lg }}
      dismissKeyboardLabel={t('keyboardDone')}
      {...(footer
        ? {
            footer: (
              <View style={{ gap: spacing.sm }}>
                {invalid ? (
                  <Text
                    variant="caption"
                    color={colors.danger}
                    accessibilityRole="alert"
                  >
                    {t('invalidForm')}
                  </Text>
                ) : null}
                {footer}
              </View>
            ),
          }
        : {})}
    >
      {children}
    </Screen>
  );
}
export function FocusInput(props: TextInputProps) {
  const input = useRef<TextInput>(null);
  const focus = useFormFocus();
  const [focused, setFocused] = useState(false);
  const visual = useProgramPresentation();
  const { width, height } = useWindowDimensions();
  useEffect(() => {
    if (!visual || !focused) return;
    // Re-register after the inline editor and its responsive layout commit.
    // Focus can precede layout when a numeric value becomes a native input.
    const frame = requestAnimationFrame(() => focus(input.current));
    return () => cancelAnimationFrame(frame);
  }, [visual, focused, focus, width, height]);
  return (
    <TextInput
      {...props}
      ref={input}
      placeholderTextColor={visual ? programInk.secondary : colors.secondary}
      selectionColor={visual ? programInk.green : colors.primary}
      returnKeyType={
        props.returnKeyType ?? (props.multiline ? 'default' : 'done')
      }
      onFocus={(event) => {
        setFocused(true);
        focus(input.current);
        props.onFocus?.(event);
      }}
      onBlur={(event) => {
        setFocused(false);
        focus(null);
        props.onBlur?.(event);
      }}
      style={[
        styles.input,
        visual && {
          backgroundColor: 'rgba(250,242,223,0.55)',
          borderColor: programInk.border,
          color: programInk.charcoal,
          borderRadius: 8,
          fontSize: 14,
        },
        props.multiline && { minHeight: 96, textAlignVertical: 'top' },
        props.style,
        focused && {
          borderColor: visual ? programInk.green : colors.primary,
          borderWidth: 1,
        },
      ]}
    />
  );
}
export function Field({
  label,
  accessory,
  error,
  ...props
}: TextInputProps & { label: string; accessory?: ReactNode; error?: string }) {
  const visual = useProgramPresentation();
  return (
    <View style={{ gap: spacing.sm }}>
      <Text
        variant="label"
        {...(visual
          ? { color: programInk.charcoal, style: { fontSize: 13 } }
          : {})}
      >
        {label}
      </Text>
      {accessory ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.elevated,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: radius.medium,
          }}
        >
          <FocusInput
            {...props}
            accessibilityLabel={label}
            style={[
              {
                flex: 1,
                minWidth: 0,
                borderWidth: 0,
                backgroundColor: 'transparent',
              },
              props.style,
            ]}
          />
          {accessory}
        </View>
      ) : (
        <FocusInput {...props} accessibilityLabel={label} />
      )}
      {error ? (
        <Text
          variant="caption"
          color={visual ? programInk.danger : colors.danger}
          accessibilityRole="alert"
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}
export function Back({
  compact = false,
  color,
}: {
  compact?: boolean;
  color?: string;
}) {
  const router = useRouter(),
    { t } = useTranslation('programs');
  const visual = useProgramPresentation();
  const fallback = useProgramBackTarget();
  const goBack = () =>
    router.canGoBack()
      ? router.back()
      : router.replace(visual ? fallback : '/program');
  if (compact || visual)
    return (
      <IconButton
        label={t('back')}
        icon={
          <ChevronLeft
            size={sizes.icon}
            color={color ?? (visual ? programInk.charcoal : colors.secondary)}
          />
        }
        onPress={goBack}
      />
    );
  return <Button variant="text" label={t('back')} onPress={goBack} />;
}
export function FormHeader({
  title,
  subtitle,
  fontSize = 26,
}: {
  title: string;
  subtitle?: string;
  fontSize?: number;
}) {
  const visual = useProgramPresentation();
  if (visual)
    return (
      <View style={{ gap: 8, position: 'relative', paddingBottom: 8 }}>
        <HeroReadabilityWash />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Back compact />
          <ProgramText
            accessibilityRole="header"
            style={{ flex: 1, fontSize, lineHeight: fontSize + 4 }}
          >
            {title.toUpperCase()}
          </ProgramText>
        </View>
        {subtitle ? (
          <Text variant="caption" color={programInk.secondary}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    );
  return (
    <View style={{ gap: spacing.sm }}>
      <View
        style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
      >
        <Back compact />
        <Text variant="h2" accessibilityRole="header" style={{ flex: 1 }}>
          {title}
        </Text>
      </View>
      {subtitle ? (
        <Text variant="caption" color={colors.secondary}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}
export function ActionMenu({
  label,
  title,
  actions,
  disabled = false,
  icon,
}: {
  label: string;
  title: string;
  disabled?: boolean;
  icon?: ReactNode;
  actions: { label: string; action: () => void; disabled?: boolean }[];
}) {
  const [open, setOpen] = useState(false);
  const visual = useProgramPresentation();
  const ActionButton = visual ? ProgramButton : Button;
  const pendingAction = useRef<(() => void) | null>(null);
  const perform = () => {
    const action = pendingAction.current;
    pendingAction.current = null;
    action?.();
  };
  const { t } = useTranslation('programs');
  return (
    <>
      <IconButton
        label={label}
        disabled={disabled}
        icon={
          icon ?? (
            <EllipsisVertical
              size={sizes.icon}
              color={visual ? programInk.secondary : colors.secondary}
            />
          )
        }
        onPress={() => setOpen(true)}
      />
      <Modal
        visible={open}
        transparent
        animationType="none"
        onDismiss={perform}
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.overlay}>
          <Card
            accessibilityViewIsModal
            style={
              visual
                ? {
                    backgroundColor: programInk.paper,
                    borderColor: programInk.border,
                  }
                : {}
            }
          >
            <Text
              variant="h3"
              color={visual ? programInk.charcoal : colors.text}
            >
              {title}
            </Text>
            {actions.map((item) => (
              <ActionButton
                key={item.label}
                variant="secondary"
                label={item.label}
                disabled={disabled || item.disabled === true}
                onPress={() => {
                  pendingAction.current = item.action;
                  setOpen(false);
                  if (Platform.OS !== 'ios') requestAnimationFrame(perform);
                }}
              />
            ))}
            <ActionButton
              variant="secondary"
              label={t('cancel')}
              onPress={() => setOpen(false)}
            />
          </Card>
        </View>
      </Modal>
    </>
  );
}
export function ErrorNotice({
  error,
  retry,
}: {
  error: unknown;
  retry?: () => void;
}) {
  const { t } = useTranslation('programs');
  const visual = useProgramPresentation();
  return (
    <Card
      style={
        visual
          ? { backgroundColor: programInk.card, borderColor: programInk.border }
          : {}
      }
    >
      <Text
        accessibilityRole="alert"
        color={visual ? programInk.danger : colors.text}
      >
        {t(
          error instanceof ApiClientError && error.code === 'CONFLICT'
            ? 'conflictError'
            : error instanceof ApiClientError &&
                error.code === 'API_NOT_CONFIGURED'
              ? 'configurationError'
              : 'serverError',
        )}
      </Text>
      {retry ? (
        <Button label={t('retry')} variant="secondary" onPress={retry} />
      ) : null}
    </Card>
  );
}
export function QueryState({
  pending,
  error,
  retry,
  presentation = false,
}: {
  pending: boolean;
  error: unknown;
  retry: () => void;
  presentation?: boolean;
}) {
  const { t } = useTranslation('programs');
  if (presentation)
    return (
      <ProgramScreen>
        <Back compact />
        {pending ? (
          <Text color={programInk.secondary} accessibilityRole="progressbar">
            {t('loading')}
          </Text>
        ) : (
          <ErrorNotice error={error} retry={retry} />
        )}
      </ProgramScreen>
    );
  return (
    <Screen>
      <Back />
      {pending ? (
        <Text accessibilityRole="progressbar">{t('loading')}</Text>
      ) : (
        <ErrorNotice error={error} retry={retry} />
      )}
    </Screen>
  );
}
export function Confirm({
  title,
  onConfirm,
  onCancel,
}: {
  title: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation('programs');
  const visual = useProgramPresentation(),
    ActionButton = visual ? ProgramButton : Button;
  return (
    <Modal transparent animationType="none" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <Card
          accessibilityViewIsModal
          style={
            visual
              ? {
                  backgroundColor: programInk.paper,
                  borderColor: programInk.border,
                }
              : {}
          }
        >
          <Text variant="h3" color={visual ? programInk.charcoal : colors.text}>
            {title}
          </Text>
          <ActionButton label={t('confirm')} onPress={onConfirm} />
          <ActionButton
            variant="secondary"
            label={t('cancel')}
            onPress={onCancel}
          />
        </Card>
      </View>
    </Modal>
  );
}
export function useConfirmation() {
  const [confirm, setConfirm] = useState<{
    title: string;
    action: () => void;
  } | null>(null);
  return {
    ask: (title: string, action: () => void) => setConfirm({ title, action }),
    dialog: confirm ? (
      <Confirm
        title={confirm.title}
        onConfirm={() => {
          setConfirm(null);
          confirm.action();
        }}
        onCancel={() => setConfirm(null)}
      />
    ) : null,
  };
}
export const styles = StyleSheet.create({
  input: {
    color: colors.text,
    backgroundColor: colors.elevated,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.medium,
    minHeight: sizes.touch,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xxl,
    backgroundColor: colors.background,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
