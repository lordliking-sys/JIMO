import { Fragment, type ReactNode } from 'react';
export { animePink } from '../../../packages/ui/src/tokens';
export const programInk = { background: '#FFF7FA' };
export const nativePopup = {
  close: 0,
  keyboardDismissals: 0,
  keyboardVisible: false,
  back: 0,
  modals: [] as {
    onRequestClose(): void;
    statusBarTranslucent: boolean;
    navigationBarTranslucent: boolean;
  }[],
  get modal() {
    return this.modals.at(-1) ?? null;
  },
  buttons: [] as {
    testID?: string;
    accessibilityLabel?: string;
    onPress?(): void;
  }[],
};
export const Platform = { OS: 'android' };
export const Keyboard = {
  isVisible: () => nativePopup.keyboardVisible,
  dismiss: () => {
    nativePopup.keyboardDismissals++;
    nativePopup.keyboardVisible = false;
  },
  addListener: () => ({ remove: () => {} }),
};
export const StyleSheet = { absoluteFill: {} };
export function useWindowDimensions() {
  return { width: 390, height: 780 };
}
export function useSafeAreaInsets() {
  return { top: 24, bottom: 48, left: 0, right: 0 };
}
export function View({ children }: { children?: ReactNode }) {
  return <Fragment>{children}</Fragment>;
}
export const ScrollView = View,
  Text = View,
  ActivityIndicator = View,
  ProgramPresentationProvider = View;
export function Pressable(
  props: Parameters<typeof View>[0] & (typeof nativePopup.buttons)[number],
) {
  nativePopup.buttons.push(props);
  return <View>{props.children}</View>;
}
export function Button({ label, onPress }: { label: string; onPress(): void }) {
  return (
    <Pressable accessibilityLabel={label} onPress={onPress}>
      {label}
    </Pressable>
  );
}
export function Modal(
  props: NonNullable<typeof nativePopup.modal> & { children?: ReactNode },
) {
  nativePopup.modals.push(props);
  return <View>{props.children}</View>;
}
export function useTranslation() {
  return { t: (key: string) => key };
}
export function useSharedValue(value: number) {
  return { value };
}
export function useReducedMotion() {
  return true;
}
export function useAnimatedStyle(callback: () => unknown) {
  return callback();
}
export function withTiming(value: number) {
  return value;
}
export const Easing = { cubic: () => {}, out: () => {} };
export default Object.assign(View, { View });
