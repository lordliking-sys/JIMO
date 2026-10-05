import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ChartNoAxesCombined from 'lucide-react-native/icons/chart-no-axes-combined';
import CircleUserRound from 'lucide-react-native/icons/circle-user-round';
import Dumbbell from 'lucide-react-native/icons/dumbbell';
import House from 'lucide-react-native/icons/house';
import ListChecks from 'lucide-react-native/icons/list-checks';
import { useTranslation } from 'react-i18next';
import { colors, sizes, spacing, typography } from '@jimo/ui';
export default function TabsLayout() {
  const { t } = useTranslation('navigation');
  const insets = useSafeAreaInsets();
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
          height: 72 + insets.bottom,
          paddingBottom: Math.max(insets.bottom, spacing.sm),
          borderTopColor: colors.border,
        },
        tabBarItemStyle: {
          minHeight: sizes.touch,
          paddingVertical: spacing.xs,
        },
        tabBarLabelStyle: { ...typography.caption },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('home'),
          tabBarIcon: ({ color }) => (
            <House size={sizes.tabIcon} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="program"
        options={{
          title: t('program'),
          tabBarIcon: ({ color }) => (
            <ListChecks size={sizes.tabIcon} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="workout"
        options={{
          title: t('workout'),
          tabBarIcon: ({ color }) => (
            <Dumbbell size={sizes.tabIcon} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: t('progress'),
          tabBarIcon: ({ color }) => (
            <ChartNoAxesCombined size={sizes.tabIcon} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('profile'),
          tabBarIcon: ({ color }) => (
            <CircleUserRound size={sizes.tabIcon} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
