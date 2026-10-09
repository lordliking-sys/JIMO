import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  useState,
  type ReactNode,
} from 'react';
import { Platform } from 'react-native';
import {
  ClerkProvider,
  useAuth,
  useClerk,
  useUser,
  useSignIn,
  useSignUp,
} from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import { resourceCache } from '@clerk/expo/resource-cache';
import { Button, Screen, Text } from '@jimo/ui';
import { useTranslation } from 'react-i18next';
import { hideAsync } from 'expo-splash-screen';
import { StartupScreen } from '../components/StartupScreen';
import { configureTokenProvider } from './tokens';
import { isTestAuth } from './helpers';
import {
  basePasswordPolicy,
  passwordPolicyFromClerk,
  type PasswordPolicy,
} from './password-policy';
type Credentials = { email: string; password: string };
export interface AuthSession {
  loaded: boolean;
  signedIn: boolean;
  subject: string | null;
  email: string | null;
  test: boolean;
  signOut(): Promise<void>;
  signIn(input: Credentials): Promise<'complete' | 'verify'>;
  verifySignIn(code: string): Promise<void>;
  resendSignIn(): Promise<void>;
  signUp(input: Credentials): Promise<'complete' | 'verify'>;
  verifyEmail(code: string): Promise<void>;
  resendEmail(): Promise<void>;
  forgotPassword(email: string): Promise<void>;
  verifyReset(code: string): Promise<void>;
  resetPassword(password: string): Promise<void>;
  needsAuth: boolean;
  passwordPolicy: PasswordPolicy;
}
const Context = createContext<AuthSession | null>(null);
const subscribeHydration = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;
const nativeResourceCache = Platform.OS === 'web' ? undefined : resourceCache;
function check(result: { error: unknown }) {
  if (result.error) throw result.error;
}
function ClerkSession({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, userId, getToken } = useAuth();
  const { user } = useUser();
  const clerk = useClerk(),
    { signOut } = clerk;
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();
  const [needsAuth, setNeedsAuth] = useState(false);
  useEffect(() => {
    configureTokenProvider({
      getToken: (refresh) => getToken({ skipCache: !!refresh }),
      unauthorized: () => setNeedsAuth(true),
    });
    return () => configureTokenProvider(null);
  }, [getToken, userId]);
  const finishSignIn = async () => {
    if (signIn.status !== 'complete')
      throw { code: 'unsupported_verification' };
    check(await signIn.finalize());
    setNeedsAuth(false);
  };
  const value: AuthSession = {
    loaded: isLoaded,
    signedIn: !!isSignedIn,
    subject: userId ?? null,
    email: user?.primaryEmailAddress?.emailAddress ?? null,
    test: false,
    needsAuth,
    passwordPolicy: passwordPolicyFromClerk(clerk),
    signOut: async () => {
      await signOut();
      setNeedsAuth(false);
    },
    signIn: async ({ email, password }) => {
      check(await signIn.password({ emailAddress: email, password }));
      if (signIn.status === 'complete') {
        await finishSignIn();
        return 'complete';
      }
      // Clerk client-trust email challenge is distinct from password reset/MFA.
      if (
        signIn.status === 'needs_second_factor' &&
        signIn.supportedSecondFactors?.some((f) => f.strategy === 'email_code')
      ) {
        check(await signIn.mfa.sendEmailCode());
        return 'verify';
      }
      throw { code: 'unsupported_verification' };
    },
    verifySignIn: async (code) => {
      check(await signIn.mfa.verifyEmailCode({ code }));
      await finishSignIn();
    },
    resendSignIn: async () => {
      check(await signIn.mfa.sendEmailCode());
    },
    signUp: async ({ email, password }) => {
      check(await signUp.password({ emailAddress: email, password }));
      if (signUp.status === 'complete') {
        check(await signUp.finalize());
        setNeedsAuth(false);
        return 'complete';
      }
      check(await signUp.verifications.sendEmailCode());
      return 'verify';
    },
    verifyEmail: async (code) => {
      check(await signUp.verifications.verifyEmailCode({ code }));
      if (signUp.status !== 'complete')
        throw { code: 'unsupported_verification' };
      check(await signUp.finalize());
      setNeedsAuth(false);
    },
    resendEmail: async () => {
      check(await signUp.verifications.sendEmailCode());
    },
    forgotPassword: async (email) => {
      check(await signIn.create({ identifier: email }));
      check(await signIn.resetPasswordEmailCode.sendCode());
    },
    verifyReset: async (code) => {
      check(await signIn.resetPasswordEmailCode.verifyCode({ code }));
    },
    resetPassword: async (password) => {
      check(
        await signIn.resetPasswordEmailCode.submitPassword({
          password,
          signOutOfOtherSessions: true,
        }),
      );
      await finishSignIn();
    },
  };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
/** No credentials, no provider bypass: usable only in a separately built local web test artifact. */
function TestSession({ children }: { children: ReactNode }) {
  const [signedIn, setSignedIn] = useState(
    () => sessionStorage.getItem('jimo.test.signedOut') !== 'true',
  );
  useEffect(() => {
    configureTokenProvider(null);
  }, [signedIn]);
  const value = useMemo<AuthSession>(() => {
    const login = async () => {
      sessionStorage.removeItem('jimo.test.signedOut');
      setSignedIn(true);
    };
    return {
      loaded: true,
      signedIn,
      subject: signedIn ? 'test-fixture' : null,
      email: null,
      test: true,
      needsAuth: false,
      passwordPolicy: basePasswordPolicy,
      signOut: async () => {
        sessionStorage.setItem('jimo.test.signedOut', 'true');
        setSignedIn(false);
      },
      signIn: async () => {
        await login();
        return 'complete';
      },
      signUp: async () => 'verify',
      verifySignIn: login,
      resendSignIn: async () => {},
      verifyEmail: login,
      resendEmail: async () => {},
      forgotPassword: async () => {},
      verifyReset: async () => {},
      resetPassword: login,
    };
  }, [signedIn]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
function ConfigurationScreen() {
  const { t } = useTranslation('auth');
  useEffect(() => {
    void hideAsync();
  }, []);
  return (
    <Screen>
      <Text variant="h1">JIMO</Text>
      <Text accessibilityRole="alert">{t('configuration')}</Text>
      <Button
        label={t('retry')}
        onPress={() => {
          if (Platform.OS === 'web') window.location.reload();
        }}
      />
    </Screen>
  );
}
export function SessionProvider({ children }: { children: ReactNode }) {
  // Static web HTML and its first hydration render must resolve auth identically.
  const mounted = useSyncExternalStore(
    subscribeHydration,
    clientSnapshot,
    serverSnapshot,
  );
  const key = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!mounted) return <StartupScreen error={false} retry={() => {}} />;
  if (
    isTestAuth(
      process.env.EXPO_PUBLIC_AUTH_TEST,
      Platform.OS,
      Platform.OS === 'web' && typeof window !== 'undefined'
        ? window.location.origin
        : '',
    )
  )
    return <TestSession>{children}</TestSession>;
  if (!key) return <ConfigurationScreen />;
  return (
    <ClerkProvider
      publishableKey={key}
      __experimental_disableNativeClientSync
      {...(tokenCache ? { tokenCache } : {})}
      {...(nativeResourceCache
        ? { __experimental_resourceCache: nativeResourceCache }
        : {})}
    >
      <ClerkSession>{children}</ClerkSession>
    </ClerkProvider>
  );
}
export function useAuthSession() {
  const state = useContext(Context);
  if (!state) throw new Error('SessionProvider missing');
  return state;
}
