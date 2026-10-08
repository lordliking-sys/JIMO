import { useCallback } from 'react';
import { BackHandler, Keyboard, Platform } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import { useTranslation } from 'react-i18next';
import { colors, IconButton } from '@jimo/ui';
import {
  registerSafeHardwareBack,
  safeBack,
  type BackFallback,
} from './safe-back';

export function useSafeBack(
  fallback: BackFallback = '/workout',
  dismiss?: () => void,
  hardware = true,
) {
  const router = useRouter();
  const goBack = useCallback(() => {
    safeBack(router, fallback, dismiss);
  }, [router, fallback, dismiss]);
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'android' || !hardware) return;
      return registerSafeHardwareBack(BackHandler, () => {
        if (Keyboard.isVisible()) Keyboard.dismiss();
        else goBack();
      });
    }, [goBack, hardware]),
  );
  return goBack;
}

export function SafeBack({
  fallback = '/workout',
  dismiss,
  color = colors.secondary,
}: {
  fallback?: BackFallback;
  dismiss?: (() => void) | undefined;
  color?: string;
}) {
  const goBack = useSafeBack(fallback, dismiss, false),
    { t } = useTranslation('common');
  return (
    <IconButton
      label={t('back')}
      onPress={goBack}
      icon={<ChevronLeft size={30} color={color} strokeWidth={1.4} />}
    />
  );
}
