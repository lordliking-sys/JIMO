import { View, type ViewProps } from 'react-native';
import { passwordPolicyFromSettings } from '../src/auth/password-policy';
/** Isolated provider records action names only, never supplied email/password/token values. */
export const loginActions: string[] = [];
export const loginFixture: {
  error: string | null;
  deferred: boolean;
  verify: boolean;
  release: (() => void) | null;
} = {
  error: null,
  deferred: false,
  verify: false,
  release: null,
};
async function invoke(action: string) {
  loginActions.push(action);
  if (loginFixture.deferred)
    await new Promise<void>((resolve) => {
      loginFixture.release = resolve;
    });
  if (loginFixture.error) throw { errors: [{ code: loginFixture.error }] };
}
export function useAuthSession() {
  return {
    loaded: !new URLSearchParams(location.search).has('unloaded'),
    needsAuth: false,
    passwordPolicy: passwordPolicyFromSettings({ min_length: 8 }),
    signIn: async () => {
      await invoke('signIn');
      return loginFixture.verify ? 'verify' : 'complete';
    },
    signUp: async () => {
      await invoke('signUp');
      return 'verify';
    },
    verifySignIn: async () => invoke('verifySignIn'),
    verifyEmail: async () => invoke('verifyEmail'),
    signOut: async () => invoke('signOut'),
    forgotPassword: async () => invoke('forgotPassword'),
    verifyReset: async () => invoke('verifyReset'),
    resetPassword: async () => invoke('resetPassword'),
    resendEmail: async () => invoke('resendEmail'),
    resendSignIn: async () => invoke('resendSignIn'),
  };
}
export function useRouter() {
  return {
    push: (path: string) => loginActions.push(`push:${path}`),
    replace: (path: string) => loginActions.push(`replace:${path}`),
  };
}
export function SafeAreaView({ children, ...props }: ViewProps) {
  return <View {...props}>{children}</View>;
}
export function useSafeAreaInsets() {
  const q = new URLSearchParams(location.search);
  return {
    top: Number(q.get('top') ?? 24),
    bottom: Number(q.get('bottom') ?? 34),
    left: 0,
    right: 0,
  };
}
export function useFocusEffect() {}
export function useIsFocused() {
  return true;
}
export function useFonts() {
  return [true];
}
export function StatusBar() {
  return null;
}
