import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  View,
  useWindowDimensions,
  type ImageSourcePropType,
  type ViewStyle,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import { ThemeArtwork } from '../themes/anime-pink/Artwork';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { programHeroHeight } from './section-hero-geometry';

type Canvas = {
  source: ImageSourcePropType | null;
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
  const { width, height: viewportHeight, fontScale } = useWindowDimensions(),
    insets = useSafeAreaInsets(),
    key = `${width}:${viewportHeight}:${fontScale}:${insets.top}`;
  const [measurement, setMeasurement] = useState({ key, height: 0 });
  const height = Math.max(
    Math.max(280, Math.min(480, viewportHeight * 0.46)) - insets.top,
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
  width: _width,
  height,
  bodyColor,
  dark = true,
}: {
  source: ImageSourcePropType | null;
  width: number;
  height: number;
  bodyColor: string;
  dark?: boolean;
}) {
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
      }}
    >
      <ThemeArtwork
        source={source}
        dark={dark}
        bodyColor={bodyColor}
        testID="section-hero-image"
      />
    </View>
  );
}
