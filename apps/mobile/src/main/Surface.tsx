import { createContext, useContext, type ReactNode } from 'react';
import {
  View,
  ScrollView,
  Text as NativeText,
  useWindowDimensions,
  type TextProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from 'expo-router/js-tabs';
import { useIsFocused } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Text, Button, animePink } from '@jimo/ui';
import { useTranslation } from 'react-i18next';
import {
  SectionHeroScope,
  SectionHeroCanvas,
  useSectionHeroGeometry,
  useSectionStatusBar,
} from '../components/SectionHero';
import { tabArtwork } from '../components/tab-artwork';
import { SectionStatusFade } from '../components/SectionStatusFade';
export const MainPresentation = createContext(true);
export function MainText({ style, ...props }: TextProps) {
  useContext(MainPresentation);
  return (
    <NativeText
      {...props}
      style={[
        {
          fontFamily: 'Inter_600SemiBold',
          fontSize: 18,
          lineHeight: 24,
          color: animePink.textPrimary,
          fontVariant: ['tabular-nums'],
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
  const insets = useSafeAreaInsets(),
    { width } = useWindowDimensions(),
    tabHeight = useBottomTabBarHeight(),
    focused = useIsFocused(),
    geometry = useSectionHeroGeometry();
  const padding = width < 360 ? 16 : 20,
    status = useSectionStatusBar(
      true,
      geometry.height + insets.top - 24,
      insets.top,
    );
  return (
    <View
      testID={light ? 'home-main-screen' : 'program-main-screen'}
      style={{ flex: 1, backgroundColor: animePink.background }}
    >
      {focused ? <StatusBar style={status.style} /> : null}
      <ScrollView
        testID="main-scroll"
        onScroll={status.onScroll}
        scrollEventThrottle={16}
        bounces={false}
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top,
          paddingBottom: tabHeight + 24,
        }}
      >
        <View
          style={{
            width: '100%',
            paddingLeft: insets.left + padding,
            paddingRight: insets.right + padding,
          }}
        >
          <SectionHeroCanvas
            source={light ? tabArtwork.home : tabArtwork.program}
            width={width}
            topInset={insets.top}
            sideInset={insets.left + padding}
            dark
            bodyColor={animePink.background}
          >
            <MainPresentation.Provider value={true}>
              {children}
            </MainPresentation.Provider>
          </SectionHeroCanvas>
        </View>
      </ScrollView>
      <SectionStatusFade
        topInset={insets.top}
        lightIcons={status.style === 'light'}
      />
    </View>
  );
}
export function MainScreen(props: { children: ReactNode; light?: boolean }) {
  return (
    <SectionHeroScope>
      <MainSurface {...props} />
    </SectionHeroScope>
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
  return (
    <Button
      label={label}
      onPress={onPress}
      disabled={disabled}
      variant={subtle ? 'secondary' : 'primary'}
      {...(subtle ? { style: { backgroundColor: 'transparent' } } : {})}
    />
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
        borderRadius: 20,
        backgroundColor: animePink.surface,
        borderWidth: 1,
        borderColor: animePink.border,
        gap: 12,
      }}
    >
      <Text
        accessibilityRole={loading ? 'progressbar' : 'alert'}
        color={animePink.textSecondary}
      >
        {loading ? t('programs:loading') : t('programs:serverError')}
      </Text>
      {!loading && retry ? (
        <MainButton subtle label={t('retry')} onPress={retry} />
      ) : null}
    </View>
  );
}
