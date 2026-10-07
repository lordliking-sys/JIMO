import { useState } from 'react';
import { Keyboard, Pressable, StyleSheet, View } from 'react-native';
import type { KeyboardTypeOptions } from 'react-native';
import Minus from 'lucide-react-native/icons/minus';
import Plus from 'lucide-react-native/icons/plus';
import Check from 'lucide-react-native/icons/check';
import { useTranslation } from 'react-i18next';
import { colors, IconButton, radius, sizes, spacing, Text } from '@jimo/ui';
import { FocusInput } from './components';

export function Choice({
  label,
  selected,
  onPress,
  accessibilityLabel,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected }}
      aria-pressed={selected}
      onPress={onPress}
      style={({ pressed }) => [
        styles.choice,
        {
          borderColor: selected ? colors.activeBorder : colors.border,
          backgroundColor: selected ? colors.elevated : colors.surface,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <Text
        variant="label"
        color={selected ? colors.primarySoft : colors.secondary}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function NumberControl({
  label,
  value,
  onChange,
  onStep,
  min = 0,
  max,
  keyboardType = 'number-pad',
  hint,
  presets = [],
  presetsFirst = false,
  prefix = '',
  unit = '',
  manualLabel,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onStep: (direction: 1 | -1) => void;
  min?: number;
  max?: number;
  keyboardType?: KeyboardTypeOptions;
  hint?: string;
  presets?: { value: string; label: string; accessibilityLabel?: string }[];
  presetsFirst?: boolean;
  prefix?: string;
  unit?: string;
  manualLabel?: string;
}) {
  const { t } = useTranslation('programs');
  const [editing, setEditing] = useState(false);
  const finish = () => {
    Keyboard.dismiss();
    setEditing(false);
  };
  const current = Number(value.replace(',', '.'));
  const valid = value.trim() !== '' && Number.isFinite(current);
  const normalize = (text: string) =>
    text
      .trim()
      .replace(',', '.')
      .replace(/(\.\d*?)0+$/, '$1')
      .replace(/\.$/, '');
  const chips = presets.length ? (
    <View style={styles.choices}>
      {presets.map((preset) => (
        <Choice
          key={preset.value}
          label={preset.label}
          {...(preset.accessibilityLabel
            ? { accessibilityLabel: preset.accessibilityLabel }
            : {})}
          selected={normalize(value) === normalize(preset.value)}
          onPress={() => {
            onChange(preset.value);
            finish();
          }}
        />
      ))}
    </View>
  ) : null;
  return (
    <View style={{ gap: spacing.sm }}>
      <Text variant="label">{label}</Text>
      {presetsFirst ? chips : null}
      <View style={styles.control}>
        <IconButton
          icon={<Minus size={sizes.icon} color={colors.text} />}
          label={`${t('decrease')} ${label}`}
          disabled={!value.trim() || (valid && current <= min)}
          onPress={() => onStep(-1)}
        />
        {editing ? (
          <FocusInput
            accessibilityLabel={label}
            accessibilityHint={t('numberHint')}
            value={value}
            onChangeText={onChange}
            keyboardType={keyboardType}
            placeholder="—"
            style={styles.value}
            autoFocus
            onSubmitEditing={finish}
          />
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={manualLabel ?? t('manualValue', { label })}
            accessibilityHint={t('numberHint')}
            accessibilityValue={{ text: value || t('unspecified') }}
            onPress={() => setEditing(true)}
            style={[styles.display, { flex: 1 }]}
          >
            <Text
              variant="h3"
              color={value ? colors.primarySoft : colors.secondary}
              style={{ textAlign: 'center' }}
            >
              {value ? `${prefix}${value}${unit ? ` ${unit}` : ''}` : '—'}
            </Text>
            {manualLabel ? (
              <Text
                variant="caption"
                color={colors.secondary}
                style={{ textAlign: 'center' }}
              >
                {manualLabel}
              </Text>
            ) : null}
          </Pressable>
        )}
        <IconButton
          icon={<Plus size={sizes.icon} color={colors.text} />}
          label={`${t('increase')} ${label}`}
          disabled={valid && max !== undefined && current >= max}
          onPress={() => onStep(1)}
        />
        {editing ? (
          <IconButton
            label={t('confirmValue', { label })}
            icon={<Check color={colors.primary} size={sizes.icon} />}
            onPress={finish}
          />
        ) : null}
      </View>
      {hint ? (
        <Text variant="caption" color={colors.secondary}>
          {hint}
        </Text>
      ) : null}
      {!presetsFirst ? chips : null}
    </View>
  );
}
export const choiceStyles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
const styles = StyleSheet.create({
  control: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  value: {
    flex: 1,
    minWidth: 0,
    textAlign: 'center',
    fontFamily: 'Inter_600SemiBold',
    paddingHorizontal: spacing.sm,
  },
  display: {
    minHeight: sizes.touch,
    minWidth: sizes.touch,
    padding: spacing.sm,
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.medium,
    justifyContent: 'center',
  },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  choice: {
    minHeight: sizes.touch,
    minWidth: sizes.touch,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.medium,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
