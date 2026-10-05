import { useEffect } from 'react';
import { ActivityIndicator } from 'react-native';
import { hideAsync } from 'expo-splash-screen';
import { Button, colors, Screen, Text } from '@jimo/ui';
import { useTranslation } from 'react-i18next';
export function StartupScreen({
  error,
  retry,
}: {
  error: boolean;
  retry: () => void;
}) {
  const { t } = useTranslation();
  useEffect(() => {
    if (error) void hideAsync();
  }, [error]);
  return (
    <Screen>
      {error ? (
        <>
          <Text accessibilityRole="alert">{t('startupError')}</Text>
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
