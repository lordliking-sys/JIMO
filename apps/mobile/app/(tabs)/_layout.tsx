import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWindowDimensions } from 'react-native';
import type { ColorValue } from 'react-native';
import ChartNoAxesCombined from 'lucide-react-native/icons/chart-no-axes-combined';
import CircleUserRound from 'lucide-react-native/icons/circle-user-round';
import Dumbbell from 'lucide-react-native/icons/dumbbell';
import House from 'lucide-react-native/icons/house';
import ListChecks from 'lucide-react-native/icons/list-checks';
import { useTranslation } from 'react-i18next';
import { colors, sizes, spacing, Text } from '@jimo/ui';
export default function TabsLayout() {
  const { t } = useTranslation('navigation');
  const insets = useSafeAreaInsets();
  const { width, fontScale } = useWindowDimensions();
  const compact = width < 400 || fontScale > 1;
  const label = (text: string) =>
    function TabLabel({ color }: { color: ColorValue }) {
      return (
        <Text
          variant="caption"
          style={{
            color,
            textAlign: 'center',
            width: '100%',
            paddingHorizontal: spacing.xs,
          }}
        >
          {text}
        </Text>
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
        tabBarStyle: {
          backgroundColor: colors.surface,
          height: 72 + Math.max(0, fontScale - 1) * 40 + insets.bottom,
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
          tabBarLabel: label(t(compact ? 'compact.program' : 'program')),
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
          tabBarLabel: label(t(compact ? 'compact.workout' : 'workout')),
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
          tabBarLabel: label(t('progress')),
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
          tabBarLabel: label(t('profile')),
          tabBarIcon: ({ color }) => (
            <CircleUserRound size={sizes.tabIcon} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
