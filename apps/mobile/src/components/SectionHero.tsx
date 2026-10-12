import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useId,
  type ReactNode,
} from 'react';
import {
  Image,
  StyleSheet,
  View,
  useWindowDimensions,
  type ImageSourcePropType,
  type ViewStyle,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { ink } from '../progress-profile/theme';
import { sectionHeroHeight, programHeroHeight } from './section-hero-geometry';

type Canvas = {
  source: ImageSourcePropType;
  width: number;
  topInset: number;
  sideInset: number;
  bodyColor: string;
  dark: boolean;
};
const HeroCanvas = createContext<Canvas | null>(null);
export function SectionHeroCanvas({
  children,
  ...value
}: Canvas & { children: ReactNode }) {
  return <HeroCanvas.Provider value={value}>{children}</HeroCanvas.Provider>;
}
/** Both pixels and status icon contrast follow the same scrolling frame. */
export function useSectionStatusBar(
  darkHero: boolean,
  height: number,
  topInset: number,
) {
  const [underHero, setUnderHero] = useState(true);
  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      setUnderHero(e.nativeEvent.contentOffset.y < height - topInset / 2);
    },
    [height, topInset],
  );
  return {
    style: darkHero && underHero ? ('light' as const) : ('dark' as const),
    onScroll,
  };
}
const Geometry = createContext<{
  height: number;
  report(height: number): void;
} | null>(null);
export function SectionHeroProvider({ children }: { children: ReactNode }) {
  const { width, fontScale } = useWindowDimensions(),
    key = `${width}:${fontScale}`;
  const [measurement, setMeasurement] = useState({ key, height: 0 });
  const height = Math.max(
    sectionHeroHeight(width, fontScale),
    measurement.key === key ? measurement.height : 0,
  );
  const report = useCallback(
    (next: number) =>
      setMeasurement((current) => {
        if (current.key === key && next <= current.height + 1) return current;
        return {
          key,
          height: Math.max(next, current.key === key ? current.height : 0),
        };
      }),
    [key],
  );
  const value = useMemo(() => ({ height, report }), [height, report]);
  return <Geometry.Provider value={value}>{children}</Geometry.Provider>;
}
export function SectionHeroScope({ children }: { children: ReactNode }) {
  return useContext(Geometry) ? (
    children
  ) : (
    <SectionHeroProvider>{children}</SectionHeroProvider>
  );
}
export function useSectionHeroGeometry() {
  const value = useContext(Geometry);
  if (!value) throw new Error('Section hero requires its presentation scope');
  return value;
}
export function SectionHeroFrame({
  children,
  testID,
  compact = false,
  measured,
  style,
}: {
  children?: ReactNode;
  testID: string;
  compact?: boolean;
  measured?: (height: number) => void;
  style?: ViewStyle;
}) {
  const canvas = useContext(HeroCanvas);
  const [ownHeight, setOwnHeight] = useState(0);
  const geometry = useSectionHeroGeometry(),
    { width, fontScale } = useWindowDimensions();
  return (
    <View
      testID={testID}
      onLayout={(e) => {
        setOwnHeight(e.nativeEvent.layout.height);
        if (!compact) geometry.report(e.nativeEvent.layout.height);
        measured?.(e.nativeEvent.layout.height);
      }}
      style={{
        minHeight: compact
          ? programHeroHeight(width, fontScale)
          : geometry.height,
        paddingTop: 22,
        paddingBottom: 18,
        justifyContent: 'flex-end',
        ...style,
      }}
    >
      {canvas ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: -canvas.topInset,
            left: -canvas.sideInset,
            width: canvas.width,
            height:
              (ownHeight ||
                (compact
                  ? programHeroHeight(width, fontScale)
                  : geometry.height)) + canvas.topInset,
          }}
        >
          <SectionHeroArtwork
            source={canvas.source}
            width={canvas.width}
            height={
              (ownHeight ||
                (compact
                  ? programHeroHeight(width, fontScale)
                  : geometry.height)) + canvas.topInset
            }
            bodyColor={canvas.bodyColor}
            dark={canvas.dark}
          />
        </View>
      ) : null}
      {children}
    </View>
  );
}
/** Illustration is bounded at the seam; all later content uses an opaque body. */
export function SectionHeroArtwork({
  source,
  width,
  height,
  bodyColor,
  dark = false,
}: {
  source: ImageSourcePropType;
  width: number;
  height: number;
  bodyColor: string;
  dark?: boolean;
}) {
  const id = `section-wash-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <View
      pointerEvents="none"
      testID="section-hero-art"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height,
        overflow: 'hidden',
        backgroundColor: bodyColor,
      }}
    >
      <Image
        testID="section-hero-image"
        source={source}
        accessible={false}
        resizeMode="cover"
        style={{
          width: '100%',
          height: Math.max(height, (width * 1672) / 941),
          position: 'absolute',
          top: 0,
        }}
      />
      <Svg
        accessible={false}
        width="100%"
        height="100%"
        style={StyleSheet.absoluteFill}
      >
        <Defs>
          <LinearGradient id={id} x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop
              offset={0}
              stopColor={dark ? ink.charcoal : ink.paper}
              stopOpacity={dark ? 0.26 : 0.18}
            />
            <Stop
              offset={0.28}
              stopColor={dark ? ink.charcoal : ink.paper}
              stopOpacity={0}
            />
            <Stop offset={0.9} stopColor={bodyColor} stopOpacity={0} />
            <Stop offset={1} stopColor={bodyColor} stopOpacity={1} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}
