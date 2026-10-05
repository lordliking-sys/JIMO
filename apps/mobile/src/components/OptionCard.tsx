import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Check from 'lucide-react-native/icons/check';
import { colors, radius, sizes, spacing, Text } from '@jimo/ui';
import { useTranslation } from 'react-i18next';
export function OptionCard({
  label,
  description,
  selected,
  multiple = false,
  disabled = false,
  onPress,
  icon,
}: {
  label: string;
  description?: string;
  selected: boolean;
  multiple?: boolean;
  disabled?: boolean;
  onPress: () => void;
  icon?: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <Pressable
      accessibilityRole={multiple ? 'checkbox' : 'radio'}
      accessibilityLabel={label}
      aria-checked={selected}
      aria-disabled={disabled}
      accessibilityState={{ checked: selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.option,
        {
          borderColor: selected ? colors.activeBorder : colors.border,
          backgroundColor: selected ? colors.elevated : colors.surface,
          opacity: pressed || disabled ? 0.65 : 1,
        },
      ]}
    >
      {icon}
      <View style={styles.copy}>
        <Text variant="bodyMedium">{label}</Text>
        {description ? (
          <Text variant="caption" color={colors.secondary}>
            {description}
          </Text>
        ) : null}
        {selected ? (
          <Text variant="caption" color={colors.primarySoft}>
            {t('selected')}
          </Text>
        ) : null}
      </View>
      <View
        style={[
          styles.check,
          {
            borderRadius: multiple ? radius.small : radius.full,
            borderColor: selected ? colors.primary : colors.secondary,
          },
        ]}
      >
        {selected ? (
          <Check
            size={16}
            color={colors.primary}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
        ) : null}
      </View>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  option: {
    minHeight: sizes.touch,
    borderWidth: 1,
    borderRadius: radius.large,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  copy: { flex: 1, gap: spacing.xs },
  check: {
    width: sizes.icon,
    height: sizes.icon,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
