import { useEffect, useState } from 'react';
import {
  BackHandler,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import type { KeyboardTypeOptions } from 'react-native';
import Minus from 'lucide-react-native/icons/minus';
import Plus from 'lucide-react-native/icons/plus';
import Check from 'lucide-react-native/icons/check';
import { useTranslation } from 'react-i18next';
import { colors, IconButton, radius, sizes, spacing, Text } from '@jimo/ui';
import { FocusInput } from './components';
import { useProgramPresentation, programInk } from './presentation';

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
  const visual = useProgramPresentation();
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
          borderColor: visual
            ? selected
              ? programInk.green
              : programInk.border
            : selected
              ? colors.activeBorder
              : colors.border,
          backgroundColor: visual
            ? selected
              ? programInk.green
              : 'rgba(250,242,223,0.5)'
            : selected
              ? colors.elevated
              : colors.surface,
          ...(visual ? { paddingHorizontal: 12, borderRadius: 7 } : {}),
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <Text
        variant="label"
        color={
          visual
            ? selected
              ? programInk.paper
              : programInk.secondary
            : selected
              ? colors.primarySoft
              : colors.secondary
        }
        style={visual ? { fontSize: 12 } : {}}
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
  displayLabel,
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
  displayLabel?: string;
}) {
  const { t } = useTranslation('programs');
  const [editing, setEditing] = useState(false);
  const visual = useProgramPresentation(),
    controlColor = visual ? programInk.charcoal : colors.text;
  useEffect(() => {
    if (!editing || !visual) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      Keyboard.dismiss();
      setEditing(false);
      return true;
    });
    return () => sub.remove();
  }, [editing, visual]);
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
  const chipsBody = presets.length ? (
    <View
      style={[
        styles.choices,
        visual && { flexWrap: 'nowrap', alignItems: 'center' },
      ]}
    >
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
  const chips =
    visual && chipsBody ? (
      <ScrollView
        horizontal
        style={{ flexGrow: 0, flexShrink: 0 }}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ alignItems: 'center' }}
      >
        {chipsBody}
      </ScrollView>
    ) : (
      chipsBody
    );
  const compact = visual && !editing;
  return (
    <View style={{ gap: spacing.sm }}>
      {!compact ? (
        <Text
          variant="label"
          color={visual ? programInk.charcoal : colors.text}
        >
          {displayLabel ?? label}
        </Text>
      ) : null}
      {presetsFirst ? chips : null}
      <View
        style={{
          flexDirection: compact ? 'row' : 'column',
          alignItems: compact ? 'center' : 'stretch',
          gap: 8,
        }}
      >
        {compact ? (
          <Text
            variant="label"
            color={programInk.charcoal}
            style={{ flex: 1, minWidth: 0, fontSize: 13 }}
          >
            {displayLabel ?? label}
          </Text>
        ) : null}
        <View
          style={[
            styles.control,
            visual && {
              gap: 0,
              borderWidth: 1,
              borderColor: programInk.border,
              borderRadius: 7,
              backgroundColor: 'rgba(250,242,223,0.65)',
            },
            compact && { width: 164 },
          ]}
        >
          <IconButton
            icon={<Minus size={sizes.icon} color={controlColor} />}
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
              style={[
                styles.display,
                { flex: 1 },
                visual && {
                  backgroundColor: 'transparent',
                  paddingHorizontal: 0,
                },
              ]}
            >
              <Text
                variant="h3"
                color={
                  visual
                    ? programInk.charcoal
                    : value
                      ? colors.primarySoft
                      : colors.secondary
                }
                style={{ textAlign: 'center' }}
              >
                {value ? `${prefix}${value}${unit ? ` ${unit}` : ''}` : '—'}
              </Text>
              {manualLabel ? (
                <Text
                  variant="caption"
                  color={visual ? programInk.secondary : colors.secondary}
                  style={{ textAlign: 'center' }}
                >
                  {manualLabel}
                </Text>
              ) : null}
            </Pressable>
          )}
          <IconButton
            icon={<Plus size={sizes.icon} color={controlColor} />}
            label={`${t('increase')} ${label}`}
            disabled={valid && max !== undefined && current >= max}
            onPress={() => onStep(1)}
          />
          {editing ? (
            <IconButton
              label={t('confirmValue', { label })}
              icon={
                <Check
                  color={visual ? programInk.green : colors.primary}
                  size={sizes.icon}
                />
              }
              onPress={finish}
            />
          ) : null}
        </View>
      </View>
      {hint && !visual ? (
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
    backgroundColor: colors.background,
    borderWidth: 0,
    borderColor: colors.border,
    borderRadius: radius.medium,
    justifyContent: 'center',
  },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  choice: {
    minHeight: sizes.touch,
    minWidth: sizes.touch,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.medium,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
