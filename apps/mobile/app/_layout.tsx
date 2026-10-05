import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { I18nextProvider } from 'react-i18next';
import { colors } from '@jimo/ui';
import { i18n } from '../src/i18n';
import {
  PreferencesProvider,
  usePreferences,
} from '../src/storage/PreferencesProvider';
import { StartupScreen } from '../src/components/StartupScreen';
import { BrandTransition } from '../src/components/BrandTransition';
void SplashScreen.preventAutoHideAsync();
const theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    primary: colors.primary,
    border: colors.border,
  },
};
function AppNavigator() {
  const { preferences, startupError, retry } = usePreferences();
  const [brandComplete, setBrandComplete] = useState(false);
  const finishBrand = useCallback(() => setBrandComplete(true), []);
  if (!preferences) return <StartupScreen error={startupError} retry={retry} />;
  return (
    <>
      <View
        style={{ flex: 1 }}
        pointerEvents={brandComplete ? 'auto' : 'none'}
        aria-hidden={!brandComplete}
        accessibilityElementsHidden={!brandComplete}
        importantForAccessibility={
          brandComplete ? 'auto' : 'no-hide-descendants'
        }
      >
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Protected guard={!preferences.onboardingCompleted}>
            <Stack.Screen name="onboarding" />
          </Stack.Protected>
          <Stack.Protected guard={preferences.onboardingCompleted}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="program/create" />
          </Stack.Protected>
        </Stack>
      </View>
      {!brandComplete ? (
        <BrandTransition
          onComplete={finishBrand}
          returning={preferences.onboardingCompleted}
        />
      ) : null}
    </>
  );
}
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <I18nextProvider i18n={i18n}>
        <PreferencesProvider>
          <ThemeProvider value={theme}>
            <StatusBar style="light" />
            <AppNavigator />
          </ThemeProvider>
        </PreferencesProvider>
      </I18nextProvider>
    </SafeAreaProvider>
  );
}
