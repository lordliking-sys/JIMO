import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, useWindowDimensions } from 'react-native';
import type { ColorValue } from 'react-native';
import ChartNoAxesCombined from 'lucide-react-native/icons/chart-no-axes-combined';
import CircleUserRound from 'lucide-react-native/icons/circle-user-round';
import Dumbbell from 'lucide-react-native/icons/dumbbell';
import House from 'lucide-react-native/icons/house';
import ListChecks from 'lucide-react-native/icons/list-checks';
import { useTranslation } from 'react-i18next';
import { colors, sizes, spacing, Text } from '@jimo/ui';
import { tabLabelKey } from '../../src/components/tab-labels';
export default function TabsLayout() {
  const { t } = useTranslation('navigation');
  const insets = useSafeAreaInsets();
  const { width, fontScale } = useWindowDimensions();
  const availableWidth = width - insets.left - insets.right;
  const label = (text: string) =>
    function TabLabel({ color }: { color: ColorValue }) {
      return (
        // Match the navigator's 5 px button padding without a fixed pixel width,
        // so captions resize with the tab immediately during rotation/layout.
        <View style={{ alignSelf: 'stretch', marginHorizontal: -5 }}>
          <Text
            variant="caption"
            numberOfLines={1}
            ellipsizeMode="clip"
            maxFontSizeMultiplier={1.5}
            style={{
              color,
              textAlign: 'center',
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
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarShowLabel: true,
        tabBarLabelPosition: 'below-icon',
        tabBarAllowFontScaling: true,
        tabBarInactiveTintColor: colors.secondary,
        tabBarActiveBackgroundColor: colors.elevated,
        tabBarStyle: {
          backgroundColor: colors.surface,
          height:
            72 + Math.max(0, Math.min(fontScale, 1.5) - 1) * 36 + insets.bottom,
          paddingBottom: Math.max(insets.bottom, spacing.sm),
          borderTopColor: colors.border,
        },
        tabBarItemStyle: {
          minHeight: sizes.touch,
          paddingVertical: spacing.xs,
        },
        sceneStyle: { backgroundColor: colors.background },
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
          title: t('program'),
          tabBarAccessibilityLabel: t('program'),
          tabBarLabel: label(
            t(tabLabelKey('program', availableWidth, fontScale)),
          ),
          tabBarIcon: ({ color }) => (
            <ListChecks size={sizes.tabIcon} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="workout"
        options={{
          title: t('workout'),
          tabBarAccessibilityLabel: t('workout'),
          tabBarLabel: label(
            t(tabLabelKey('workout', availableWidth, fontScale)),
          ),
          tabBarIcon: ({ color }) => (
            <Dumbbell size={sizes.tabIcon} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: t('progress'),
          tabBarAccessibilityLabel: t('progress'),
          tabBarLabel: label(
            t(tabLabelKey('progress', availableWidth, fontScale)),
          ),
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
          tabBarLabel: label(
            t(tabLabelKey('profile', availableWidth, fontScale)),
          ),
          tabBarIcon: ({ color }) => (
            <CircleUserRound size={sizes.tabIcon} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
