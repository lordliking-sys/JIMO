import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useCallback,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import {
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import type { TextInput, TextProps } from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { artwork, ink } from './theme';

const FontReady = createContext(false);
const ContentWidth = createContext<number | null>(null);
const FieldFocus = createContext<(input: TextInput | null) => void>(() => {});
export const useWorkoutFieldFocus = () => useContext(FieldFocus);

export function useWorkoutLayout() {
  const { width, height, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const usableHeight = height - insets.top - insets.bottom;
  const padding = width < 360 ? 16 : 22;
  const measuredWidth = useContext(ContentWidth);
  return {
    width: width - insets.left - insets.right,
    contentWidth:
      measuredWidth ?? width - insets.left - insets.right - padding * 2,
    usableHeight,
    fontScale,
    padding,
    standardImageHeight: Math.min(112, Math.max(64, usableHeight * 0.14)),
    pyramidImageHeight: Math.min(
      136,
      Math.max(88, usableHeight * 0.17 - (width < 360 ? 16 : 0)),
    ),
    restRing: Math.min(300, width - 56, Math.max(200, usableHeight * 0.35)),
    emomRing: Math.min(300, width - 56, Math.max(200, usableHeight * 0.4)),
  };
}

export function InkText({ style, ...props }: TextProps) {
  const loaded = useContext(FontReady);
  return (
    <Text
      {...props}
      style={[
        {
          color: ink.parchment,
          fontFamily: loaded
            ? 'JimoWorkoutSerif'
            : Platform.OS === 'ios'
              ? 'Georgia'
              : 'serif',
          fontSize: 22,
          fontVariant: ['lining-nums', 'tabular-nums'],
        },
        style,
      ]}
    />
  );
}

export function WorkoutTypography({ children }: { children: ReactNode }) {
  const [ready] = useFonts({
    JimoWorkoutSerif: require('../../../assets/jimo/workout/fonts/CormorantGaramond.ttf'),
  });
  return <FontReady.Provider value={ready}>{children}</FontReady.Provider>;
}

/** Shared workout-only form viewport; keeps keyboard/scroll and footer apart. */
export function WorkoutFormViewport({
  children,
  footer,
  centered = false,
  variant = 'standard',
}: {
  children: ReactNode;
  footer?: ReactNode;
  centered?: boolean;
  variant?: 'standard' | 'rest' | 'emom' | 'pyramid';
}) {
  const { width, height } = useWindowDimensions();
  const { padding } = useWorkoutLayout();
  const [contentWidth, setContentWidth] = useState<number | null>(null);
  const scroll = useRef<ScrollView>(null),
    viewport = useRef<View>(null),
    focused = useRef<TextInput | null>(null),
    offset = useRef(0),
    keyboardTop = useRef(Infinity);
  const reveal = useCallback(() => {
    viewport.current?.measureInWindow((_x, top, _w, viewportHeight) => {
      focused.current?.measureInWindow((_ix, fieldTop, _iw, fieldHeight) => {
        const bottom = Math.min(top + viewportHeight, keyboardTop.current) - 12;
        const delta =
          fieldTop < top + 12
            ? fieldTop - top - 12
            : Math.max(0, fieldTop + fieldHeight - bottom);
        if (delta)
          scroll.current?.scrollTo({
            y: Math.max(0, offset.current + delta),
            animated: false,
          });
      });
    });
  }, []);
  useEffect(() => {
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(reveal);
    });
    return () => cancelAnimationFrame(frame);
  }, [width, height, reveal]);
  useEffect(() => {
    const shown = Keyboard.addListener('keyboardDidShow', (e) => {
      keyboardTop.current = e.endCoordinates.screenY;
      requestAnimationFrame(reveal);
    });
    const changed = Keyboard.addListener('keyboardWillChangeFrame', (e) => {
      keyboardTop.current = e.endCoordinates.screenY;
      requestAnimationFrame(reveal);
    });
    const hidden = Keyboard.addListener('keyboardDidHide', () => {
      keyboardTop.current = Infinity;
    });
    return () => {
      shown.remove();
      changed.remove();
      hidden.remove();
    };
  }, [reveal]);
  return (
    <FieldFocus.Provider
      value={(input) => {
        focused.current = input;
        requestAnimationFrame(reveal);
      }}
    >
      <KeyboardAvoidingView
        style={{ flex: 1, minHeight: 0 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View
          ref={viewport}
          testID="workout-viewport"
          style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}
          onLayout={(event) => {
            setContentWidth(event.nativeEvent.layout.width - padding * 2);
            requestAnimationFrame(reveal);
          }}
        >
          <ScrollView
            ref={scroll}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'web' ? 'none' : 'on-drag'}
            onScroll={(e) => {
              offset.current = e.nativeEvent.contentOffset.y;
            }}
            scrollEventThrottle={16}
            onContentSizeChange={() => requestAnimationFrame(reveal)}
            contentContainerStyle={{
              flexGrow: 1,
              paddingHorizontal: padding,
              paddingTop: 12,
              paddingBottom: 8,
              gap: variant === 'pyramid' ? 3 : variant === 'rest' ? 6 : 8,
              ...(centered ? { alignItems: 'center' as const } : {}),
            }}
          >
            <ContentWidth.Provider value={contentWidth}>
              {children}
            </ContentWidth.Provider>
          </ScrollView>
        </View>
        {footer ? (
          <View
            testID="workout-footer"
            style={{
              flexShrink: 0,
              paddingHorizontal: padding,
              paddingBottom: 8,
              paddingTop: 8,
            }}
          >
            {footer}
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </FieldFocus.Provider>
  );
}

export function WorkoutSurface({
  children,
  footer,
  centered = false,
  variant = 'standard',
}: {
  children: ReactNode;
  footer?: ReactNode;
  centered?: boolean;
  variant?: 'standard' | 'rest' | 'emom' | 'pyramid';
}) {
  return (
    <View
      testID="workout-surface"
      style={{ flex: 1, minHeight: 0, backgroundColor: ink.background }}
    >
      <Image
        source={artwork.background}
        resizeMode="cover"
        style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]}
        accessible={false}
      />
      <Svg
        style={StyleSheet.absoluteFill}
        width="100%"
        height="100%"
        pointerEvents="none"
      >
        <Defs>
          <LinearGradient id="workoutInkShade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#080d09" stopOpacity="0.4" />
            <Stop offset="0.2" stopColor="#080d09" stopOpacity="0.1" />
            <Stop offset="0.5" stopColor="#080d09" stopOpacity="0.25" />
            <Stop offset="0.72" stopColor="#080d09" stopOpacity="0.75" />
            <Stop offset="0.9" stopColor="#080d09" stopOpacity="0.65" />
            <Stop offset="1" stopColor="#080d09" stopOpacity="0.25" />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#workoutInkShade)" />
      </Svg>
      <StatusBar style="light" />
      <WorkoutTypography>
        <SafeAreaView
          style={{ flex: 1 }}
          edges={['top', 'bottom', 'left', 'right']}
        >
          <WorkoutFormViewport
            footer={footer}
            centered={centered}
            variant={variant}
          >
            {children}
          </WorkoutFormViewport>
        </SafeAreaView>
      </WorkoutTypography>
    </View>
  );
}
