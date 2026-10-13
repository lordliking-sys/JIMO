import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  Image,
  StyleSheet,
  View,
  useWindowDimensions,
  type ImageSourcePropType,
} from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useId } from 'react';
import { ink } from '../progress-profile/theme';

export function mainTabHeroHeight(width: number, fontScale: number) {
  return Math.max(296 * Math.max(1, fontScale), Math.min(width, 560) * 0.82);
}
type HeroGeometry = { height: number; report(height: number): void };
const Geometry = createContext<HeroGeometry | null>(null);
/** Both tab heroes share the largest content measurement, including dynamic type. */
export function MainTabHeroProvider({ children }: { children: ReactNode }) {
  const { width, fontScale } = useWindowDimensions(),
    key = `${width}:${fontScale}`;
  const [measurement, setMeasurement] = useState({ key, height: 0 });
  const height = Math.max(
    mainTabHeroHeight(width, fontScale),
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
/** Isolated component fixtures and directly rendered screens receive the same layout contract. */
export function MainTabHeroScope({ children }: { children: ReactNode }) {
  const parent = useContext(Geometry);
  return parent ? (
    children
  ) : (
    <MainTabHeroProvider>{children}</MainTabHeroProvider>
  );
}
export function useMainTabHeroGeometry() {
  const value = useContext(Geometry);
  if (!value) throw new Error('MainTabHero requires its presentation scope');
  return value;
}
export function MainTabHero({
  children,
  testID,
}: {
  children: ReactNode;
  testID: string;
}) {
  const { height, report } = useMainTabHeroGeometry();
  return (
    <View
      testID={testID}
      onLayout={(event) => report(event.nativeEvent.layout.height)}
      style={{ minHeight: height, paddingTop: 22, paddingBottom: 18 }}
    >
      {children}
    </View>
  );
}
export function MainTabHeroArtwork({
  source,
  width,
  height,
  dark,
  lighten = false,
  imageTestID,
}: {
  source: ImageSourcePropType | null;
  width: number;
  height: number;
  dark: boolean;
  lighten?: boolean;
  imageTestID?: string;
}) {
  const id = `tab-hero-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <View
      pointerEvents="none"
      testID="editorial-hero-art"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height,
        overflow: 'hidden',
        backgroundColor: dark ? ink.charcoal : ink.paper,
      }}
    >
      <Image
        testID={imageTestID}
        source={source ?? undefined}
        accessible={false}
        resizeMode="cover"
        style={{
          width: '100%',
          height: Math.max(height, (width * 1672) / 941),
          position: 'absolute',
          top: 0,
        }}
      />
      {lighten ? (
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: 'rgba(246, 237, 217, 0.58)' },
          ]}
        />
      ) : null}
      {dark ? (
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: 'rgba(16, 19, 15, 0.24)' },
          ]}
        />
      ) : null}
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
              stopOpacity={dark ? 0.18 : 0.45}
            />
            <Stop
              offset={0.25}
              stopColor={dark ? ink.charcoal : ink.paper}
              stopOpacity={0}
            />
            <Stop offset={0.94} stopColor={ink.paper} stopOpacity={0} />
            <Stop offset={1} stopColor={ink.paper} stopOpacity={1} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}
