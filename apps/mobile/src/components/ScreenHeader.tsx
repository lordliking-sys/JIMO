import { View } from 'react-native';
import { Text, colors, spacing } from '@jimo/ui';
import { BrandMark } from './BrandMark';
/** Editorial header; settings live in Profile and never overlay screen content. */
export function ScreenHeader({
  title,
  subtitle,
  light = false,
}: {
  title: string;
  subtitle?: string;
  light?: boolean;
}) {
  return (
    <View style={{ gap: spacing.sm, paddingTop: light ? 0 : spacing.sm }}>
      <BrandMark subtle />
      <Text variant="h1" accessibilityRole="header">
        {title}
      </Text>
      {subtitle ? (
        <Text color={colors.secondary} variant="caption">
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}
