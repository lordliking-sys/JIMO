import { Pressable, ScrollView } from 'react-native';
import { Text, colors, radius, sizes, spacing } from '@jimo/ui';
export function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string; accessibilityLabel?: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <ScrollView
      horizontal
      style={{ flexGrow: 0, flexShrink: 0 }}
      contentContainerStyle={{ alignItems: 'center', gap: spacing.xs }}
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      showsHorizontalScrollIndicator={false}
    >
      {options.map((option) => (
        <Pressable
          key={option.value}
          accessibilityRole="radio"
          accessibilityLabel={option.accessibilityLabel ?? option.label}
          accessibilityState={{ checked: value === option.value }}
          aria-checked={value === option.value}
          onPress={() => onChange(option.value)}
          style={({ pressed }) => ({
            flexGrow: 0,
            flexShrink: 0,
            minHeight: sizes.touch,
            minWidth: sizes.touch,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
            justifyContent: 'center',
            borderRadius: radius.small,
            borderBottomWidth: 2,
            borderBottomColor:
              value === option.value ? colors.primary : 'transparent',
            backgroundColor:
              value === option.value ? colors.surface : 'transparent',
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Text
            variant="label"
            color={value === option.value ? colors.text : colors.secondary}
          >
            {option.label}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}
