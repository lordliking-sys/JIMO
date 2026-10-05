import type { ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, colors, spacing, Text } from '@jimo/ui';
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
      <View style={styles.icon}>{icon}</View>
      <Text variant="h3">{title}</Text>
      <Text color={colors.secondary}>{description}</Text>
      {children}
    </Card>
  );
}
const styles = StyleSheet.create({
  icon: { paddingVertical: spacing.lg, alignItems: 'flex-start' },
});
