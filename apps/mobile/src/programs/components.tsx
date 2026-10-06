import { useState } from 'react';
import { TextInput, StyleSheet, View, Modal } from 'react-native';
import type { TextInputProps } from 'react-native';
import { useRouter } from 'expo-router';
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
} from '@jimo/ui';
import { ApiClientError } from '../api/client';
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={{ gap: spacing.sm }}>
      <Text variant="label">{label}</Text>
      <TextInput
        {...props}
        accessibilityLabel={label}
        placeholderTextColor={colors.secondary}
        style={[
          styles.input,
          props.multiline && { minHeight: 96 },
          props.style,
        ]}
      />
    </View>
  );
}
export function Back() {
  const router = useRouter(),
    { t } = useTranslation('programs');
  return (
    <Button
      variant="secondary"
      label={t('back')}
      onPress={() =>
        router.canGoBack() ? router.back() : router.replace('/program')
      }
    />
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
  return (
    <Card>
      <Text accessibilityRole="alert">
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
}: {
  pending: boolean;
  error: unknown;
  retry: () => void;
}) {
  const { t } = useTranslation('programs');
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
  return (
    <Modal transparent animationType="none" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <Card accessibilityViewIsModal>
          <Text variant="h3">{title}</Text>
          <Button label={t('confirm')} onPress={onConfirm} />
          <Button variant="secondary" label={t('cancel')} onPress={onCancel} />
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
    padding: spacing.lg,
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
