import { Pressable, StyleSheet, View } from 'react-native';
import type { KeyboardTypeOptions } from 'react-native';
import Minus from 'lucide-react-native/icons/minus';
import Plus from 'lucide-react-native/icons/plus';
import { useTranslation } from 'react-i18next';
import { colors, IconButton, radius, sizes, spacing, Text } from '@jimo/ui';
import { FocusInput } from './components';

export function Choice({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onStep: (direction: 1 | -1) => void;
  min?: number;
  max?: number;
  keyboardType?: KeyboardTypeOptions;
  hint?: string;
  presets?: { value: string; label: string }[];
}) {
  const { t } = useTranslation('programs');
  const current = Number(value.replace(',', '.'));
  const valid = value.trim() !== '' && Number.isFinite(current);
  return (
    <View style={{ gap: spacing.sm }}>
      <Text variant="label">{label}</Text>
      <View style={styles.control}>
        <IconButton
          icon={<Minus size={sizes.icon} color={colors.text} />}
          label={`${t('decrease')} ${label}`}
          disabled={!value.trim() || (valid && current <= min)}
          onPress={() => onStep(-1)}
        />
        <FocusInput
          accessibilityLabel={label}
          accessibilityHint={t('numberHint')}
          value={value}
          onChangeText={onChange}
          keyboardType={keyboardType}
          placeholder="—"
          style={styles.value}
        />
        <IconButton
          icon={<Plus size={sizes.icon} color={colors.text} />}
          label={`${t('increase')} ${label}`}
          disabled={valid && max !== undefined && current >= max}
          onPress={() => onStep(1)}
        />
      </View>
      {hint ? (
        <Text variant="caption" color={colors.secondary}>
          {hint}
        </Text>
      ) : null}
      {presets.length ? (
        <View style={styles.choices}>
          {presets.map((preset) => (
            <Choice
              key={preset.value}
              label={preset.label}
              selected={value === preset.value}
              onPress={() => onChange(preset.value)}
            />
          ))}
        </View>
      ) : null}
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
