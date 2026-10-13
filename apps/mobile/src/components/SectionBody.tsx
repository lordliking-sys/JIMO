import { View, useWindowDimensions, type ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { animePink } from '@jimo/ui';
/** A seam and its content form one surface. Cards below it must represent distinct items. */
export function SectionBody({
  padding: supplied,
  overlap = 24,
  color = animePink.background,
  style,
  ...props
}: ViewProps & { padding?: number; overlap?: number; color?: string }) {
  const { width } = useWindowDimensions(),
    insets = useSafeAreaInsets();
  const padding = supplied ?? (width < 360 ? 16 : 20);
  return (
    <View
      {...props}
      style={[
        {
          marginLeft: -(insets.left + padding),
          marginRight: -(insets.right + padding),
          marginTop: -overlap,
          paddingLeft: insets.left + padding,
          paddingRight: insets.right + padding,
          paddingTop: 20,
          paddingBottom: 20,
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          backgroundColor: color,
          gap: 16,
        },
        style,
      ]}
    />
  );
}
