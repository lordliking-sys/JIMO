export type BackFallback = '/workout' | '/program' | '/';
export type BackNavigator = {
  canGoBack: () => boolean;
  back: () => void;
  replace: (fallback: BackFallback) => void;
};

/** Check at press time: deep links and navigation guards can reset the stack. */
export function safeBack(
  navigation: BackNavigator,
  fallback: BackFallback = '/workout',
  dismiss?: () => void,
): 'dismiss' | 'back' | 'fallback' {
  if (dismiss) {
    dismiss();
    return 'dismiss';
  }
  if (navigation.canGoBack()) {
    navigation.back();
    return 'back';
  }
  navigation.replace(fallback);
  return 'fallback';
}

export function registerSafeHardwareBack(
  source: {
    addEventListener: (
      name: 'hardwareBackPress',
      listener: () => boolean,
    ) => { remove: () => void };
  },
  onBack: () => void,
) {
  const subscription = source.addEventListener('hardwareBackPress', () => {
    onBack();
    return true;
  });
  return () => subscription.remove();
}
