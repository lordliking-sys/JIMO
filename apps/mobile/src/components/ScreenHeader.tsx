import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Settings from 'lucide-react-native/icons/settings';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, IconButton, radius, sizes, spacing, Text } from '@jimo/ui';

/** Static track lines give the header an athletic identity without competing with content. */
export function ScreenHeader({
  title,
  subtitle,
  light = false,
  settings = false,
}: {
  title: string;
  subtitle?: string;
  light?: boolean;
  settings?: boolean;
}) {
  const router = useRouter();
  const { t } = useTranslation();
  return (
    <View style={[styles.header, light && styles.light]}>
      {!light ? (
        <View
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={styles.motif}
        >
          <Svg width={144} height={64} viewBox="0 0 144 64">
            <Path
              d="M-16 64 L48 0 M16 64 L80 0 M48 64 L112 0 M80 64 L144 0"
              stroke={colors.border}
              strokeWidth={1}
            />
            <Path
              d="M112 64 L176 0"
              stroke={colors.activeBorder}
              strokeWidth={2}
            />
          </Svg>
        </View>
      ) : null}
      <View style={styles.top}>
        <View style={styles.brand}>
          <View style={styles.mark} />
          <Text
            variant="caption"
            color={colors.secondary}
            style={{ letterSpacing: 2 }}
          >
            {t('brand.name')}
          </Text>
        </View>
        {settings ? (
          <IconButton
            label={t('settings')}
            onPress={() => router.push('/profile')}
            icon={
              <Settings
                size={sizes.icon}
                strokeWidth={1.75}
                color={colors.secondary}
              />
            }
          />
        ) : null}
      </View>
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
const styles = StyleSheet.create({
  header: {
    borderRadius: radius.xl,
    borderColor: colors.border,
    borderWidth: 1,
    backgroundColor: colors.surface,
    padding: spacing.xl,
    gap: spacing.md,
    overflow: 'hidden',
  },
  light: {
    backgroundColor: colors.background,
    borderWidth: 0,
    padding: 0,
    overflow: 'visible',
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: sizes.touch,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  mark: {
    width: spacing.xs,
    height: spacing.md,
    borderRadius: radius.small,
    backgroundColor: colors.primary,
  },
  motif: { position: 'absolute', top: 0, right: 0 },
});
