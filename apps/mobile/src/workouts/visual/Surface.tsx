import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useCallback,
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { artwork, ink } from './theme';

const FontReady = createContext(false);
const FieldFocus = createContext<(input: TextInput | null) => void>(() => {});
export const useWorkoutFieldFocus = () => useContext(FieldFocus);

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

/** Keyboard handling is local to Workout, including focus after viewport resize. */
export function WorkoutSurface({
  children,
  footer,
  centered = false,
}: {
  children: ReactNode;
  footer?: ReactNode;
  centered?: boolean;
}) {
  const [fontsReady] = useFonts({
    JimoWorkoutSerif: require('../../../assets/jimo/workout/fonts/CormorantGaramond.ttf'),
  });
  const { width, height } = useWindowDimensions();
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
    <View style={{ flex: 1, backgroundColor: ink.background }}>
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
      <FontReady.Provider value={fontsReady}>
        <FieldFocus.Provider
          value={(input) => {
            focused.current = input;
            requestAnimationFrame(reveal);
          }}
        >
          <SafeAreaView
            style={{ flex: 1 }}
            edges={['top', 'bottom', 'left', 'right']}
          >
            <KeyboardAvoidingView
              style={{ flex: 1 }}
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
              <View
                ref={viewport}
                style={{ flex: 1 }}
                onLayout={() => requestAnimationFrame(reveal)}
              >
                <ScrollView
                  ref={scroll}
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode={
                    Platform.OS === 'web' ? 'none' : 'on-drag'
                  }
                  onScroll={(e) => {
                    offset.current = e.nativeEvent.contentOffset.y;
                  }}
                  scrollEventThrottle={16}
                  onContentSizeChange={() => requestAnimationFrame(reveal)}
                  contentContainerStyle={{
                    flexGrow: 1,
                    paddingHorizontal: 24,
                    paddingTop: 24,
                    paddingBottom: 12,
                    gap: 12,
                    ...(centered ? { alignItems: 'center' as const } : {}),
                  }}
                >
                  {children}
                </ScrollView>
              </View>
              {footer ? (
                <View
                  style={{
                    paddingHorizontal: 24,
                    paddingBottom: 16,
                    paddingTop: 8,
                  }}
                >
                  {footer}
                </View>
              ) : null}
            </KeyboardAvoidingView>
          </SafeAreaView>
        </FieldFocus.Provider>
      </FontReady.Provider>
    </View>
  );
}
