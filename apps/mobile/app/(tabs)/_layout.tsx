import { SectionHeroProvider } from '../../src/components/SectionHero';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWindowDimensions } from 'react-native';
import ChartNoAxesCombined from 'lucide-react-native/icons/chart-no-axes-combined';
import CircleUserRound from 'lucide-react-native/icons/circle-user-round';
import House from 'lucide-react-native/icons/house';
import FileText from 'lucide-react-native/icons/file-text';
import { useTranslation } from 'react-i18next';
import { animePink, sizes } from '@jimo/ui';
import { FloatingTabBar } from '../../src/components/FloatingTabBar';
import { floatingNavGeometry } from '../../src/components/floating-nav-geometry';
export default function TabsLayout() {
  const { t } = useTranslation('navigation');
  const insets = useSafeAreaInsets();
  const { width, fontScale } = useWindowDimensions();
  const geometry = floatingNavGeometry(
    width,
    insets.bottom,
    insets.left,
    insets.right,
    fontScale,
  );
  return (
    <SectionHeroProvider>
      <Tabs
        tabBar={(props) => <FloatingTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: animePink.primaryText,
          tabBarInactiveTintColor: animePink.ink,
          tabBarShowLabel: true,
          tabBarLabelPosition: 'below-icon',
          tabBarAllowFontScaling: true,
          tabBarActiveBackgroundColor: 'transparent',
          tabBarStyle: {
            position: 'absolute',
            height: geometry.occupiedHeight,
            backgroundColor: 'transparent',
            borderTopWidth: 0,
          },
          sceneStyle: { backgroundColor: animePink.background },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: t('home'),
            tabBarAccessibilityLabel: t('home'),
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
            tabBarIcon: ({ color }) => (
              <CircleUserRound size={sizes.tabIcon} color={color} />
            ),
          }}
        />
      </Tabs>
    </SectionHeroProvider>
  );
}
