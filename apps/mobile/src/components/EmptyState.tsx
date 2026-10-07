import type { ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, spacing, radius, Text } from '@jimo/ui';
export function EmptyState({
  icon,
  title,
  description,
  children,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <View style={{ gap: spacing.lg, paddingVertical: spacing.lg }}>
      <View
        style={styles.icon}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {icon}
      </View>
      <Text variant="h2">{title}</Text>
      <Text color={colors.secondary}>{description}</Text>
      {children}
    </View>
  );
}
const styles = StyleSheet.create({
  icon: {
    width: 64,
    height: 64,
    borderRadius: radius.large,
    borderWidth: 1,
    borderColor: colors.activeBorder,
    backgroundColor: colors.elevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
});
