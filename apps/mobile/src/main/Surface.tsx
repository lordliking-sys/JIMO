import { SectionHeroScope, SectionHeroCanvas } from '../components/SectionHero';
import { createContext, useContext, type ReactNode } from 'react';
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type TextProps,
} from 'react-native';
import { useIsFocused } from 'expo-router';
import { useBottomTabBarHeight } from 'expo-router/js-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { Text as UtilityText } from '@jimo/ui';
import { useTranslation } from 'react-i18next';
import { mainArtwork, mainInk } from './theme';
import {
  MainTabHeroArtwork,
  MainTabHeroScope,
  useMainTabHeroGeometry,
} from '../components/MainTabHero';

const Typeface = createContext(false);
const LightSurface = createContext(false);
export function MainText({ style, ...props }: TextProps) {
  const ready = useContext(Typeface),
    light = useContext(LightSurface);
  return (
    <Text
      {...props}
      style={[
        {
          fontFamily: ready
            ? 'JimoMainSerif'
            : Platform.OS === 'ios'
              ? 'Georgia'
              : 'serif',
          fontSize: 22,
          color: light ? mainInk.charcoal : mainInk.parchment,
          fontVariant: ['lining-nums', 'tabular-nums'],
        },
        style,
      ]}
    />
  );
}
function MainSurface({
  children,
  light = false,
}: {
  children: ReactNode;
  light?: boolean;
}) {
  const [ready] = useFonts({
    JimoMainSerif: require('../../assets/jimo/workout/fonts/CormorantGaramond.ttf'),
  });
  const { width } = useWindowDimensions(),
    insets = useSafeAreaInsets(),
    focused = useIsFocused(),
    tabBarHeight = useBottomTabBarHeight();
  const geometry = useMainTabHeroGeometry();
  return (
    <Typeface.Provider value={ready}>
      <LightSurface.Provider value={light}>
        <View
          testID={light ? 'home-main-screen' : 'program-main-screen'}
          style={{
            flex: 1,
            backgroundColor: light ? mainInk.ivory : mainInk.charcoal,
          }}
        >
          {focused ? <StatusBar style={light ? 'dark' : 'light'} /> : null}
          {!light ? (
            <Image
              source={mainArtwork.program}
              resizeMode="cover"
              accessible={false}
              style={[
                StyleSheet.absoluteFill,
                { width: '100%', height: '100%' },
              ]}
            />
          ) : null}
          {!light ? (
            <View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: 'rgba(16, 19, 15, 0.48)' },
              ]}
            />
          ) : null}
          <ScrollView
            testID="main-scroll"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              width: '100%',
              paddingTop: insets.top,
              // Navigator height already includes the bottom safe area.
              paddingBottom: light ? tabBarHeight + 24 : 24,
            }}
          >
            {light ? (
              <MainTabHeroArtwork
                source={mainArtwork.home}
                width={width}
                height={geometry.height + insets.top}
                dark={false}
                imageTestID="home-background"
              />
            ) : null}
            <View
              style={{
                width: '100%',
                maxWidth: 560,
                alignSelf: 'center',
                paddingLeft: insets.left + (width < 360 ? 16 : 20),
                paddingRight: insets.right + (width < 360 ? 16 : 20),
              }}
            >
              {children}
            </View>
          </ScrollView>
        </View>
      </LightSurface.Provider>
    </Typeface.Provider>
  );
}
function ProgramTabSurface({ children }: { children: ReactNode }) {
  const [ready] = useFonts({
    JimoMainSerif: require('../../assets/jimo/workout/fonts/CormorantGaramond.ttf'),
  });
  const { width } = useWindowDimensions(),
    insets = useSafeAreaInsets(),
    focused = useIsFocused();
  return (
    <Typeface.Provider value={ready}>
      <LightSurface.Provider value={false}>
        <View
          testID="program-main-screen"
          style={{ flex: 1, backgroundColor: mainInk.charcoal }}
        >
          {focused ? <StatusBar style="light" /> : null}
          <ScrollView
            testID="main-scroll"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              width: '100%',
              paddingTop: insets.top,
              paddingBottom: 24,
            }}
          >
            <View
              style={{
                width: '100%',
                maxWidth: 560,
                alignSelf: 'center',
                paddingLeft: insets.left + (width < 360 ? 16 : 20),
                paddingRight: insets.right + (width < 360 ? 16 : 20),
              }}
            >
              <SectionHeroCanvas
                source={mainArtwork.program}
                width={width}
                topInset={insets.top}
                sideInset={insets.left + (width < 360 ? 16 : 20)}
                dark
                bodyColor={mainInk.charcoal}
              >
                {children}
              </SectionHeroCanvas>
            </View>
          </ScrollView>
        </View>
      </LightSurface.Provider>
    </Typeface.Provider>
  );
}
export function MainScreen(props: { children: ReactNode; light?: boolean }) {
  if (!props.light)
    return (
      <SectionHeroScope>
        <ProgramTabSurface>{props.children}</ProgramTabSurface>
      </SectionHeroScope>
    );
  return (
    <MainTabHeroScope>
      <MainSurface {...props} />
    </MainTabHeroScope>
  );
}
export function MainButton({
  label,
  onPress,
  disabled = false,
  subtle = false,
}: {
  label: string;
  onPress(): void;
  disabled?: boolean;
  subtle?: boolean;
}) {
  const light = useContext(LightSurface);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 48,
        paddingHorizontal: 16,
        paddingVertical: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 14,
        borderWidth: subtle ? 1 : 0,
        borderColor: light ? mainInk.paperBorder : mainInk.border,
        backgroundColor: subtle
          ? light
            ? mainInk.paperSurface
            : mainInk.darkSurface
          : light
            ? mainInk.green
            : mainInk.sage,
        opacity: disabled ? 0.55 : pressed ? 0.8 : 1,
      })}
    >
      <UtilityText
        variant="bodyMedium"
        style={{
          textAlign: 'center',
          color: subtle
            ? light
              ? mainInk.charcoal
              : mainInk.parchment
            : light
              ? mainInk.parchment
              : mainInk.charcoal,
        }}
      >
        {label}
      </UtilityText>
    </Pressable>
  );
}
export function MainNotice({
  loading = false,
  retry,
}: {
  loading?: boolean;
  retry?: () => void;
}) {
  const { t } = useTranslation(['common', 'programs']);
  return (
    <View
      style={{
        padding: 16,
        borderRadius: 16,
        backgroundColor: mainInk.darkSurface,
        gap: 12,
      }}
    >
      <UtilityText
        accessibilityRole={loading ? 'progressbar' : 'alert'}
        color={mainInk.parchment}
      >
        {loading ? t('programs:loading') : t('programs:serverError')}
      </UtilityText>
      {!loading && retry ? (
        <MainButton subtle label={t('retry')} onPress={retry} />
      ) : null}
    </View>
  );
}
