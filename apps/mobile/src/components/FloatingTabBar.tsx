import { useContext, useEffect } from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BottomTabBarHeightCallbackContext,
  type BottomTabBarProps,
} from 'expo-router/js-tabs';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { animePink } from '@jimo/ui';
import { floatingNavGeometry } from './floating-nav-geometry';

function TabContent({
  focused,
  label,
  icon,
  compact,
}: {
  focused: boolean;
  label: string;
  icon: React.ReactNode;
  compact: boolean;
}) {
  const reduced = useReducedMotion(),
    scale = useSharedValue(1),
    emphasis = useSharedValue(focused ? 1 : 0);
  useEffect(() => {
    emphasis.value = reduced
      ? Number(focused)
      : withTiming(Number(focused), { duration: 230 });
    scale.value =
      focused && !reduced
        ? withSequence(
            withTiming(0.96, { duration: 40 }),
            withTiming(1.05, { duration: 100 }),
            withTiming(1, { duration: 100 }),
          )
        : 1;
  }, [focused, reduced, scale, emphasis]);
  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const labelStyle = useAnimatedStyle(() => ({
    opacity: 0.86 + emphasis.value * 0.14,
    color: interpolateColor(
      emphasis.value,
      [0, 1],
      [animePink.ink, animePink.primaryText],
    ),
  }));
  return (
    <>
      <Animated.View accessible={false} style={iconStyle}>
        {icon}
      </Animated.View>
      <Animated.Text
        numberOfLines={1}
        maxFontSizeMultiplier={1.3}
        style={[
          {
            fontFamily: 'Inter_500Medium',
            fontSize: compact ? 11 : 12,
            lineHeight: 18,
            textAlign: 'center',
          },
          labelStyle,
        ]}
      >
        {label}
      </Animated.Text>
    </>
  );
}

/** Uses the existing navigator and tab events; only its visual bar is replaced. */
export function FloatingTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const { width, fontScale } = useWindowDimensions(),
    insets = useSafeAreaInsets();
  const geometry = floatingNavGeometry(
    width,
    insets.bottom,
    insets.left,
    insets.right,
    fontScale,
  );
  const reportHeight = useContext(BottomTabBarHeightCallbackContext);
  const visible = state.routes.filter((route) => route.name !== 'workout');
  const selected = visible.findIndex(
    (route) => route.key === state.routes[state.index]?.key,
  );
  const reduced = useReducedMotion(),
    position = useSharedValue(Math.max(0, selected) * geometry.slot);
  useEffect(() => {
    const next = Math.max(0, selected) * geometry.slot;
    position.value = reduced
      ? next
      : withTiming(next, { duration: 240, easing: Easing.inOut(Easing.cubic) });
  }, [selected, geometry.slot, position, reduced]);
  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: position.value }],
  }));
  return (
    <View
      testID="floating-navbar-area"
      pointerEvents="box-none"
      onLayout={(e) => reportHeight?.(e.nativeEvent.layout.height)}
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: geometry.occupiedHeight,
        paddingBottom: geometry.gap,
        paddingLeft: insets.left + geometry.margin,
        paddingRight: insets.right + geometry.margin,
      }}
    >
      <View
        testID="floating-navbar"
        style={{
          height: geometry.height,
          padding: 6,
          borderRadius: 34,
          backgroundColor: 'rgba(255,250,254,0.96)',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.85)',
          shadowColor: animePink.primaryPink,
          shadowOpacity: 0.2,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 4 },
          elevation: 10,
        }}
      >
        <Animated.View
          testID="floating-navbar-pill"
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              left: 6,
              top: 6,
              width: geometry.slot,
              height: geometry.height - 12,
              borderRadius: 30,
              backgroundColor: '#FFF4FA',
              opacity: selected < 0 ? 0 : 1,
              shadowColor: animePink.primaryPink,
              shadowOpacity: 0.2,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 2 },
            },
            pillStyle,
          ]}
        />
        <View style={{ flex: 1, flexDirection: 'row', zIndex: 1 }}>
          {visible.map((route, index) => {
            const options = descriptors[route.key]!.options,
              focused = index === selected;
            const label =
              options.tabBarAccessibilityLabel ?? options.title ?? route.name;
            const color = focused ? animePink.primaryText : animePink.ink;
            return (
              <Pressable
                key={route.key}
                accessibilityRole="tab"
                accessibilityLabel={label}
                aria-selected={focused}
                accessibilityState={{ selected: focused }}
                onPress={() => {
                  const event = navigation.emit({
                    type: 'tabPress',
                    target: route.key,
                    canPreventDefault: true,
                  });
                  if (!focused && !event.defaultPrevented)
                    navigation.navigate(route.name, route.params);
                }}
                onLongPress={() =>
                  navigation.emit({ type: 'tabLongPress', target: route.key })
                }
                style={{
                  flex: 1,
                  minWidth: 0,
                  minHeight: 48,
                  gap: 4,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <TabContent
                  focused={focused}
                  label={label}
                  compact={width < 360}
                  icon={options.tabBarIcon?.({ focused, color, size: 25 })}
                />
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}
