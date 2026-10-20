import { useEffect } from 'react';
import { ActivityIndicator } from 'react-native';
import { hideAsync } from 'expo-splash-screen';
import { Button, colors, Screen, Text } from '@jimo/ui';
import { useTranslation } from 'react-i18next';
import type { AccountStartupIssue } from '../auth/startup-issue';
import Constants from 'expo-constants';
export function StartupScreen({
  error,
  retry,
  issue,
}: {
  error: boolean;
  retry: () => void;
  issue?: AccountStartupIssue | null;
}) {
  const { t } = useTranslation();
  const development =
    Constants.expoConfig?.extra?.jimoAppVariant === 'development';
  useEffect(() => {
    if (error) void hideAsync();
  }, [error]);
  return (
    <Screen>
      {error ? (
        <>
          <Text accessibilityRole="alert">
            {t(
              development && issue ? `accountStartup.${issue}` : 'startupError',
            )}
          </Text>
          <Button label={t('retry')} onPress={retry} />
        </>
      ) : (
        <ActivityIndicator
          color={colors.primary}
          accessibilityLabel={t('loading')}
        />
      )}
    </Screen>
  );
}
