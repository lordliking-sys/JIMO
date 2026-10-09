/** Isolated browser provider: records action names only, never credentials. */
import { View, type ViewProps } from 'react-native';
import { passwordPolicyFromSettings } from '../src/auth/password-policy';
export const actions: string[] = [];
export const fixture: { error: string | null } = { error: null };
const invoke = async (name: string) => {
  actions.push(name);
  if (fixture.error)
    throw { errors: [{ code: fixture.error, meta: { min_length: 15 } }] };
};
export function useAuthSession() {
  const query = new URLSearchParams(location.search);
  return {
    loaded: true,
    needsAuth: false,
    passwordPolicy: passwordPolicyFromSettings(
      query.has('fallback')
        ? undefined
        : {
            min_length: 15,
            max_length: 0,
            require_uppercase: query.has('strict'),
            require_numbers: query.has('strict'),
          },
    ),
    signUp: async () => {
      await invoke('signUp');
      return 'verify';
    },
    signIn: async () => {
      await invoke('signIn');
      return 'complete';
    },
    forgotPassword: async () => invoke('forgotPassword'),
    verifyReset: async () => invoke('verifyReset'),
    resetPassword: async () => invoke('resetPassword'),
    verifyEmail: async () => invoke('verifyEmail'),
    verifySignIn: async () => invoke('verifySignIn'),
    resendEmail: async () => invoke('resendEmail'),
    resendSignIn: async () => invoke('resendSignIn'),
    signOut: async () => invoke('signOut'),
  };
}
export function useRouter() {
  return {
    push: () => actions.push('push'),
    replace: () => actions.push('replace'),
  };
}
export function SafeAreaView({ children, ...props }: ViewProps) {
  return <View {...props}>{children}</View>;
}
export function useSafeAreaInsets() {
  return { top: 0, bottom: 0, left: 0, right: 0 };
}

export function useFocusEffect() {}
export function useFonts() {
  return [true];
}
export function StatusBar() {
  return null;
}
