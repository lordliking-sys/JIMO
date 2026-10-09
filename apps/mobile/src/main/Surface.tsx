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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { Text as UtilityText } from '@jimo/ui';
import { useTranslation } from 'react-i18next';
import { mainArtwork, mainInk } from './theme';
import { HomeBackdrop } from './HomeBackdrop';

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
export function MainScreen({
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
    focused = useIsFocused();
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
          <ScrollView
            testID="main-scroll"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              width: '100%',
              paddingTop: insets.top,
              paddingBottom: 24,
            }}
          >
            {light ? (
              <HomeBackdrop width={width} topInset={insets.top} />
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
