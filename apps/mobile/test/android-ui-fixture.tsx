import { Fragment, type ReactNode } from 'react';
import type { AndroidNativeProps } from '@react-native-community/datetimepicker';
export { animePink } from '../../../packages/ui/src/tokens';
export const device: {
  picker: AndroidNativeProps | null;
  buttons: { accessibilityLabel?: string; onPress?: () => void }[];
  dismissals: number;
} = { picker: null, buttons: [], dismissals: 0 };
export const Platform = { OS: 'android' };
export const Keyboard = { dismiss: () => device.dismissals++ };
export function View({ children }: { children?: ReactNode }) {
  return <Fragment>{children}</Fragment>;
}
export const Text = View,
  Card = View,
  ProgramButton = View,
  Button = View;
export function Modal() {
  return null;
}
export function Pressable(props: {
  children?: ReactNode;
  accessibilityLabel?: string;
  onPress?: () => void;
}) {
  device.buttons.push(props);
  return <View>{props.children}</View>;
}
export function useTranslation() {
  return { t: (key: string) => key, i18n: { language: 'it' } };
}
export function useProgramPresentation() {
  return true;
}
export const programInk = {
  paper: '#f6edd9',
  charcoal: '#10130f',
  secondary: '#555b4e',
  green: '#243b2e',
  border: '#dacbad',
};
export const colors = {
  text: programInk.charcoal,
  secondary: programInk.secondary,
  primary: programInk.green,
  border: programInk.border,
  elevated: programInk.paper,
};
export const spacing = { sm: 8, md: 12 },
  styles = { input: {}, overlay: {} };
export const DateTimePickerAndroid = {
  open: (props: AndroidNativeProps) => {
    device.picker = props;
  },
};
export default function DateTimePicker() {
  return null;
}
export const Defs = 'Defs',
  LinearGradient = 'LinearGradient',
  Stop = 'Stop',
  Rect = 'Rect';
export function processColor(color: string) {
  return /^#[a-f\d]{6}$/i.test(color) ? parseInt(color.slice(1), 16) : 0;
}
export function resetDevice() {
  device.picker = null;
  device.buttons = [];
  device.dismissals = 0;
}
