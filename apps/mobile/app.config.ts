import type { ConfigContext, ExpoConfig } from 'expo/config';

/** Opt-in native development identity; the existing app.json remains the default. */
export function developmentConfig(
  config: ExpoConfig,
  env: Readonly<Record<string, string | undefined>> = process.env,
): ExpoConfig {
  const standalone = env.JIMO_STANDALONE === 'true';
  if (standalone && env.JIMO_APP_VARIANT !== 'development')
    throw new Error('JIMO standalone: seleziona la variante development.');
  if (env.JIMO_APP_VARIANT !== 'development')
    return {
      ...config,
      // Expo auto-applies the installed dev-client plugin. Keep its generated
      // launcher scheme out of the existing default app identity/deep links.
      plugins: [
        ...(config.plugins ?? []),
        ['expo-dev-client', { addGeneratedScheme: false }],
      ],
    };
  let api: URL;
  try {
    api = new URL(env.EXPO_PUBLIC_API_URL ?? '');
    if (
      !['http:', 'https:'].includes(api.protocol) ||
      api.username ||
      api.password ||
      api.search ||
      api.hash
    )
      throw new Error();
  } catch {
    throw new Error(
      'JIMO development: imposta EXPO_PUBLIC_API_URL con un URL HTTP(S) pubblico senza credenziali.',
    );
  }
  const loopback =
    api.hostname === 'localhost' ||
    api.hostname.endsWith('.localhost') ||
    /^127\./.test(api.hostname) ||
    api.hostname === '[::1]';
  if (
    api.hostname === '0.0.0.0' ||
    (loopback && env.JIMO_DEV_API_TRANSPORT !== 'adb')
  )
    throw new Error(
      'JIMO development: usa IPv4 LAN/HTTPS per EXPO_PUBLIC_API_URL. Loopback richiede JIMO_DEV_API_TRANSPORT=adb e adb reverse.',
    );
  if (
    standalone &&
    (api.protocol !== 'https:' ||
      !api.hostname.includes('.') ||
      /^[\d.]+$/.test(api.hostname) ||
      api.hostname.includes(':') ||
      /\.(local|localhost|internal|invalid|test)$/.test(api.hostname))
  )
    throw new Error(
      'JIMO standalone: serve un endpoint API HTTPS pubblico, raggiungibile senza il PC.',
    );
  if (!env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith('pk_test_'))
    throw new Error(
      'JIMO development: configura EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY della stessa istanza Clerk development dell’API.',
    );
  if (env.EXPO_PUBLIC_AUTH_TEST === 'true')
    throw new Error(
      'JIMO development: rimuovi EXPO_PUBLIC_AUTH_TEST; il telefono usa Clerk reale.',
    );
  return {
    ...config,
    name: 'JIMO Dev',
    scheme: 'jimo-dev',
    android: { ...config.android, package: 'com.jimo.development' },
    extra: {
      ...config.extra,
      jimoAppVariant: 'development',
      ...(standalone ? { jimoStandalone: true } : {}),
    },
    plugins: [
      ...(config.plugins ?? []),
      [
        'expo-dev-client',
        standalone
          ? { addGeneratedScheme: false }
          : { launchMode: 'most-recent' },
      ],
      // LAN HTTP is permitted only in this opt-in development variant.
      [
        'expo-build-properties',
        { android: { usesCleartextTraffic: api.protocol === 'http:' } },
      ],
    ],
  };
}
export default ({ config }: ConfigContext): ExpoConfig => {
  if (!config.name || !config.slug)
    throw new Error('JIMO: app.json deve definire name e slug.');
  return developmentConfig({ ...config, name: config.name, slug: config.slug });
};
