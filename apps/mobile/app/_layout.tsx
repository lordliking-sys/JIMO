import { authDestination } from '../src/auth/helpers';
import { SessionProvider, useAuthSession } from '../src/auth/SessionProvider';
import { AccountProvider, useAccount } from '../src/auth/AccountProvider';
import { OfflineProvider } from '../src/db/Provider';
import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { I18nextProvider } from 'react-i18next';
import { colors } from '@jimo/ui';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../src/api/queries';
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
  const importOptIn = process.env.EXPO_PUBLIC_AI_IMPORT_ENABLED === 'true';
  const { preferences, startupError, retry } = usePreferences();
  const session = useAuthSession(),
    account = useAccount();
  const [brandComplete, setBrandComplete] = useState(false);
  const finishBrand = useCallback(() => setBrandComplete(true), []);
  if (!preferences) return <StartupScreen error={startupError} retry={retry} />;
  const destination = authDestination({
    loaded: session.loaded,
    signedIn: session.signedIn && !session.needsAuth,
    resolved: account.resolved,
    onboarding:
      preferences.onboardingCompleted || !!preferences.accountOnboarded,
  });
  if (destination === 'loading')
    return <StartupScreen error={account.error} retry={account.retry} />;
  const onboarding =
    destination === 'onboarding' ||
    (session.test && !preferences.onboardingCompleted);
  const app = destination === 'app' && !onboarding;
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
          <Stack.Protected guard={onboarding}>
            <Stack.Screen name="onboarding" />
          </Stack.Protected>
          <Stack.Protected guard={!onboarding && !app}>
            <Stack.Screen name="auth" />
          </Stack.Protected>
          <Stack.Protected guard={app}>
            <Stack.Screen name="(tabs)" />
            <Stack.Protected guard={importOptIn}>
              <Stack.Screen name="import" />
            </Stack.Protected>
            <Stack.Screen name="workout/[id]" />
            <Stack.Screen name="progress/[id]" />
            <Stack.Screen name="program/create" />
            <Stack.Screen name="program/manual" />
            <Stack.Screen name="program/[id]/index" />
            <Stack.Screen name="program/[id]/settings" />
            <Stack.Screen name="program/[id]/day" />
            <Stack.Screen name="program/[id]/choose-exercise" />
            <Stack.Screen name="program/[id]/custom-exercise" />
            <Stack.Screen name="program/[id]/exercise" />
          </Stack.Protected>
        </Stack>
      </View>
      {!brandComplete ? (
        <BrandTransition
          onComplete={finishBrand}
          returning={preferences.onboardingCompleted || session.signedIn}
        />
      ) : null}
    </>
  );
}
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <I18nextProvider i18n={i18n}>
        <QueryClientProvider client={queryClient}>
          <PreferencesProvider>
            <ThemeProvider value={theme}>
              <StatusBar style="light" />
              <SessionProvider>
                <OfflineProvider>
                  <AccountProvider>
                    <AppNavigator />
                  </AccountProvider>
                </OfflineProvider>
              </SessionProvider>
            </ThemeProvider>
          </PreferencesProvider>
        </QueryClientProvider>
      </I18nextProvider>
    </SafeAreaProvider>
  );
}
