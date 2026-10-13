import { SectionBody } from '../components/SectionBody';
import {
  SectionHeroScope,
  SectionHeroCanvas,
  useSectionStatusBar,
  useSectionHeroGeometry,
} from '../components/SectionHero';
import {
  createContext,
  useContext,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
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
import { ProfileCharacter } from './ProfileArtwork';

const Typeface = createContext(false);
const MenuAnchor = createContext({
  jumpToMenu: () => {},
  rememberMenu: (_y: number) => {},
  rememberBody: (_y: number) => {},
});
export const useProfileMenuAnchor = () => useContext(MenuAnchor);
export function EditorialText({ style, ...props }: TextProps) {
  return (
    <Text
      {...props}
      style={[
        {
          fontFamily: 'Inter_600SemiBold',
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
          borderRadius: 20,
          padding: 16,
          shadowColor: ink.charcoal,
          shadowOpacity: 0.035,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 3 },
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
  const geometry = useSectionHeroGeometry();
  const status = useSectionStatusBar(
    true,
    geometry.height + insets.top - 24,
    insets.top,
  );
  const scroll = useRef<ScrollView>(null),
    menuOffset = useRef(0),
    bodyOffset = useRef(0);
  const anchor = useMemo(
    () => ({
      jumpToMenu: () =>
        scroll.current?.scrollTo({
          y: Math.max(
            0,
            bodyOffset.current + menuOffset.current - insets.top - 12,
          ),
          animated: false,
        }),
      rememberBody: (y: number) => {
        bodyOffset.current = y;
      },
      rememberMenu: (y: number) => {
        menuOffset.current = y;
      },
    }),
    [insets.top],
  );
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
        {focused ? <StatusBar hidden={false} style={status.style} /> : null}
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
          onScroll={status.onScroll}
          scrollEventThrottle={32}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={false}
          contentContainerStyle={{
            paddingBottom: tabHeight + 24,
            width: '100%',
          }}
        >
          <View
            style={{
              paddingTop: insets.top,
              paddingLeft: insets.left + (width < 360 ? 16 : 22),
              paddingRight: insets.right + (width < 360 ? 16 : 22),
              maxWidth: 560,
              width: '100%',
              alignSelf: 'center',
              gap: 0,
            }}
          >
            <SectionHeroCanvas
              source={profile ? artwork.profile : artwork.progress}
              width={width}
              topInset={insets.top}
              sideInset={
                Math.max(0, (width - 560) / 2) +
                insets.left +
                (width < 360 ? 16 : 22)
              }
              dark
              bodyColor={ink.paper}
            >
              <MenuAnchor.Provider value={anchor}>
                {children}
                {profile ? <ProfileCharacter /> : null}
              </MenuAnchor.Provider>
            </SectionHeroCanvas>
          </View>
        </ScrollView>
        {profile && insets.top > 0 ? (
          <View
            testID="profile-statusbar-scrim"
            pointerEvents="none"
            accessible={false}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: insets.top,
              zIndex: 4,
              backgroundColor:
                status.style === 'light' ? 'rgba(23,13,31,0.66)' : ink.paper,
            }}
          />
        ) : null}
      </KeyboardAvoidingView>
    </Typeface.Provider>
  );
}

export function EditorialScreen(props: {
  children: ReactNode;
  profile?: boolean;
}) {
  return (
    <SectionHeroScope>
      <EditorialSurface {...props} />
    </SectionHeroScope>
  );
}

/** The profile's unboxed sections and the progress metric cards share one seam. */
export function EditorialBody({
  profile = false,
  children,
}: {
  profile?: boolean;
  children: ReactNode;
}) {
  const { width } = useWindowDimensions(),
    anchor = useProfileMenuAnchor();
  return (
    <SectionBody
      testID={profile ? 'profile-body' : 'progress-body'}
      padding={width < 360 ? 16 : 22}
      color={profile ? ink.card : ink.paper}
      style={{ gap: profile ? 16 : 10 }}
      onLayout={(event) => anchor.rememberBody(event.nativeEvent.layout.y)}
    >
      {children}
    </SectionBody>
  );
}
