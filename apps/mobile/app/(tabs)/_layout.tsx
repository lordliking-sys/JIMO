import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, useWindowDimensions } from 'react-native';
import type { ColorValue } from 'react-native';
import ChartNoAxesCombined from 'lucide-react-native/icons/chart-no-axes-combined';
import CircleUserRound from 'lucide-react-native/icons/circle-user-round';
import House from 'lucide-react-native/icons/house';
import FileText from 'lucide-react-native/icons/file-text';
import { useTranslation } from 'react-i18next';
import { colors, sizes, spacing, Text } from '@jimo/ui';
import { mainInk } from '../../src/main/theme';
export default function TabsLayout() {
  const { t } = useTranslation('navigation');
  const insets = useSafeAreaInsets();
  const { width, fontScale } = useWindowDimensions();
  const availableWidth = width - insets.left - insets.right;
  const label = (text: string, emphasize = false) =>
    function TabLabel({
      color,
      focused,
    }: {
      color: ColorValue;
      focused: boolean;
    }) {
      return (
        // Match the navigator's 5 px button padding without a fixed pixel width,
        // so captions resize with the tab immediately during rotation/layout.
        <View style={{ alignSelf: 'stretch', marginHorizontal: -5 }}>
          <Text
            variant="caption"
            numberOfLines={1}
            ellipsizeMode="clip"
            maxFontSizeMultiplier={Math.min(
              1.5,
              Math.max(1, (availableWidth / 4 - 4) / 58),
            )}
            style={{
              color,
              fontSize: availableWidth < 360 ? 12 : 13,
              textAlign: 'center',
              ...(emphasize && focused
                ? { fontFamily: 'Inter_600SemiBold' }
                : {}),
              paddingHorizontal: spacing.xs / 2,
            }}
          >
            {text}
          </Text>
        </View>
      );
    };
  return (
    <Tabs
      screenOptions={({ route }) => {
        const home = route.name === 'index',
          light = home || route.name === 'progress' || route.name === 'profile',
          styled = light || route.name === 'program';
        return {
          headerShown: false,
          tabBarActiveTintColor: styled
            ? light
              ? mainInk.green
              : mainInk.sage
            : colors.primary,
          tabBarShowLabel: true,
          tabBarLabelPosition: 'below-icon',
          tabBarAllowFontScaling: true,
          tabBarInactiveTintColor: styled
            ? light
              ? mainInk.charcoal
              : mainInk.muted
            : colors.secondary,
          tabBarActiveBackgroundColor: styled ? 'transparent' : colors.elevated,
          tabBarStyle: {
            backgroundColor: styled
              ? light
                ? mainInk.ivory
                : mainInk.charcoal
              : colors.surface,
            height:
              72 +
              Math.max(0, Math.min(fontScale, 1.5) - 1) * 36 +
              insets.bottom,
            paddingBottom: Math.max(insets.bottom, spacing.sm),
            borderTopColor: styled
              ? light
                ? mainInk.paperBorder
                : mainInk.border
              : colors.border,
          },
          tabBarItemStyle: {
            minHeight: sizes.touch,
            paddingVertical: spacing.xs,
          },
          sceneStyle: {
            backgroundColor: light
              ? mainInk.ivory
              : route.name === 'program'
                ? mainInk.charcoal
                : colors.background,
          },
        };
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('home'),
          tabBarAccessibilityLabel: t('home'),
          tabBarLabel: label(t('home')),
          tabBarIcon: ({ color }) => (
            <House size={sizes.tabIcon} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="program"
        options={{
          title: t('compact.program'),
          tabBarAccessibilityLabel: t('compact.program'),
          tabBarLabel: label(t('compact.program')),
          tabBarIcon: ({ color }) => (
            <FileText size={sizes.tabIcon} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="workout"
        options={{
          href: null,
          title: t('workout'),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: t('progress'),
          tabBarAccessibilityLabel: t('progress'),
          tabBarLabel: label(t('progress'), true),
          tabBarIcon: ({ color }) => (
            <ChartNoAxesCombined size={sizes.tabIcon} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('profile'),
          tabBarAccessibilityLabel: t('profile'),
          tabBarLabel: label(t('profile'), true),
          tabBarIcon: ({ color }) => (
            <CircleUserRound size={sizes.tabIcon} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
