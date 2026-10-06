import type { ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, colors, spacing, radius, Text } from '@jimo/ui';
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
    <Card>
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
    </Card>
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
