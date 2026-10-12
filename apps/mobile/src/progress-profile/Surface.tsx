import {
  MainTabHeroScope,
  MainTabHeroArtwork,
  useMainTabHeroGeometry,
} from '../components/MainTabHero';
import {
  createContext,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type TextProps,
  type ViewProps,
} from 'react-native';
import { useFonts } from 'expo-font';
import { useIsFocused } from 'expo-router';
import { useBottomTabBarHeight } from 'expo-router/js-tabs';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text as InterText } from '@jimo/ui';
import { artwork, ink } from './theme';

const Typeface = createContext(false);
const MenuAnchor = createContext({
  jumpToMenu: () => {},
  rememberMenu: (_y: number) => {},
});
export const useProfileMenuAnchor = () => useContext(MenuAnchor);
export function EditorialText({ style, ...props }: TextProps) {
  const ready = useContext(Typeface);
  return (
    <Text
      {...props}
      style={[
        {
          fontFamily: ready
            ? 'JimoEditorialSerif'
            : Platform.OS === 'ios'
              ? 'Georgia'
              : 'serif',
          fontSize: 22,
          color: ink.charcoal,
          fontVariant: ['lining-nums', 'tabular-nums'],
        },
        style,
      ]}
    />
  );
}
export function Copy({
  style,
  ...props
}: React.ComponentProps<typeof InterText>) {
  return (
    <InterText
      {...props}
      style={[{ color: ink.secondary, fontSize: 12, lineHeight: 18 }, style]}
    />
  );
}
export function PaperCard({ style, ...props }: ViewProps) {
  return (
    <View
      {...props}
      style={[
        {
          backgroundColor: ink.card,
          borderColor: ink.border,
          borderWidth: 1,
          borderRadius: 14,
          padding: 16,
          overflow: 'hidden',
        },
        style,
      ]}
    />
  );
}
/** The navigator reports its complete height, including the bottom safe area. */
function EditorialSurface({
  children,
  profile = false,
}: {
  children: ReactNode;
  profile?: boolean;
}) {
  const [ready] = useFonts({
    JimoEditorialSerif: require('../../assets/jimo/workout/fonts/CormorantGaramond.ttf'),
  });
  const insets = useSafeAreaInsets(),
    { width } = useWindowDimensions(),
    tabHeight = useBottomTabBarHeight(),
    focused = useIsFocused();
  const geometry = useMainTabHeroGeometry();
  const [heroBehindStatusBar, setHeroBehindStatusBar] = useState(true);
  const scroll = useRef<ScrollView>(null),
    menuOffset = useRef(0);
  const anchor = useMemo(
    () => ({
      jumpToMenu: () =>
        scroll.current?.scrollTo({
          y: Math.max(0, menuOffset.current - insets.top - 12),
          animated: false,
        }),
      rememberMenu: (y: number) => {
        menuOffset.current = y;
      },
    }),
    [insets.top],
  );
  const heroHeight = geometry.height + insets.top;
  return (
    <Typeface.Provider value={ready}>
      <KeyboardAvoidingView
        enabled={profile && Platform.OS !== 'web'}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        testID={
          profile ? 'profile-editorial-screen' : 'progress-editorial-screen'
        }
        style={{ flex: 1, backgroundColor: ink.paper }}
      >
        {focused ? (
          <StatusBar
            hidden={false}
            style={profile && heroBehindStatusBar ? 'light' : 'dark'}
          />
        ) : null}
        <ScrollView
          ref={scroll}
          testID="editorial-scroll"
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentInsetAdjustmentBehavior="never"
          automaticallyAdjustContentInsets={false}
          automaticallyAdjustsScrollIndicatorInsets={false}
          bounces={false}
          overScrollMode="never"
          scrollEventThrottle={32}
          onScroll={
            profile
              ? (event) =>
                  setHeroBehindStatusBar(
                    event.nativeEvent.contentOffset.y <
                      heroHeight - insets.top / 2,
                  )
              : undefined
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingBottom: tabHeight + 24,
            width: '100%',
          }}
        >
          <View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}
          >
            <Image
              accessible={false}
              source={artwork.paper}
              resizeMode="repeat"
              style={[
                StyleSheet.absoluteFill,
                { width: '100%', height: '100%', opacity: 0.09 },
              ]}
            />
          </View>
          <MainTabHeroArtwork
            source={profile ? artwork.profile : artwork.progress}
            width={width}
            height={heroHeight}
            dark={profile}
          />
          <View
            style={{
              paddingTop: insets.top,
              paddingLeft: insets.left + (width < 360 ? 16 : 22),
              paddingRight: insets.right + (width < 360 ? 16 : 22),
              maxWidth: 560,
              width: '100%',
              alignSelf: 'center',
              gap: 10,
            }}
          >
            <MenuAnchor.Provider value={anchor}>{children}</MenuAnchor.Provider>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Typeface.Provider>
  );
}

export function EditorialScreen(props: {
  children: ReactNode;
  profile?: boolean;
}) {
  return (
    <MainTabHeroScope>
      <EditorialSurface {...props} />
    </MainTabHeroScope>
  );
}
