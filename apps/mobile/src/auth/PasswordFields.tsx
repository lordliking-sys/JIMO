import { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text, IconButton, colors, sizes, spacing } from '@jimo/ui';
import Eye from 'lucide-react-native/icons/eye';
import EyeOff from 'lucide-react-native/icons/eye-off';
import Check from 'lucide-react-native/icons/check';
import Circle from 'lucide-react-native/icons/circle';
import { Field } from '../programs/components';
import {
  passwordConfirmation,
  passwordRequirements,
  type PasswordPolicy,
} from './password-policy';

export function PasswordField({
  label,
  value,
  onChangeText,
  disabled = false,
  current = false,
  confirmation = false,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  disabled?: boolean;
  current?: boolean;
  confirmation?: boolean;
}) {
  const [visible, setVisible] = useState(false),
    { t } = useTranslation('auth');
  return (
    <Field
      label={label}
      value={value}
      onChangeText={onChangeText}
      editable={!disabled}
      secureTextEntry={!visible}
      autoCapitalize="none"
      autoCorrect={false}
      autoComplete={current ? 'current-password' : 'new-password'}
      textContentType={current ? 'password' : 'newPassword'}
      accessory={
        <IconButton
          disabled={disabled}
          label={t(
            confirmation
              ? visible
                ? 'hideConfirmation'
                : 'showConfirmation'
              : visible
                ? 'hidePassword'
                : 'showPassword',
          )}
          onPress={() => setVisible((v) => !v)}
          icon={
            visible ? (
              <EyeOff size={sizes.icon} color={colors.secondary} />
            ) : (
              <Eye size={sizes.icon} color={colors.secondary} />
            )
          }
        />
      }
    />
  );
}
export function PasswordRequirements({
  value,
  policy,
  submittedError = false,
}: {
  value: string;
  policy: PasswordPolicy;
  submittedError?: boolean;
}) {
  const { t } = useTranslation('auth');
  return (
    <View testID="password-requirements" style={{ gap: spacing.xs }}>
      <Text variant="caption" color={colors.secondary}>
        {t('requirements.title')}
      </Text>
      {passwordRequirements(value, policy).map((rule) => {
        const color = rule.satisfied
          ? colors.activeBorder
          : submittedError
            ? colors.danger
            : colors.secondary;
        return (
          <View
            key={rule.id}
            testID={`password-rule-${rule.id}`}
            accessible
            accessibilityLabel={`${t(`requirements.${rule.id}`, { count: rule.count })}. ${t(rule.satisfied ? 'requirements.met' : 'requirements.pending')}`}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
            }}
          >
            {rule.satisfied ? (
              <Check size={15} color={color} accessible={false} />
            ) : (
              <Circle size={12} color={color} accessible={false} />
            )}
            <Text variant="caption" color={color} style={{ flex: 1 }}>
              {t(`requirements.${rule.id}`, { count: rule.count })}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
export function PasswordConfirmation({
  password,
  value,
  onChangeText,
  disabled,
  submittedError = false,
}: {
  password: string;
  value: string;
  onChangeText: (value: string) => void;
  disabled?: boolean;
  submittedError?: boolean;
}) {
  const { t } = useTranslation('auth'),
    state = passwordConfirmation(password, value);
  return (
    <View style={{ gap: spacing.sm }}>
      <PasswordField
        label={t('confirmPassword')}
        value={value}
        onChangeText={onChangeText}
        confirmation
        {...(disabled !== undefined ? { disabled } : {})}
      />
      {state ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
          }}
        >
          {state === 'match' ? (
            <Check size={15} color={colors.activeBorder} accessible={false} />
          ) : null}
          <Text
            testID="password-confirmation-feedback"
            variant="caption"
            accessibilityLiveRegion="polite"
            color={
              state === 'match'
                ? colors.activeBorder
                : submittedError
                  ? colors.danger
                  : colors.secondary
            }
            style={{ flex: 1 }}
          >
            {t(
              state === 'match' ? 'confirmationMatch' : 'confirmationMismatch',
            )}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
