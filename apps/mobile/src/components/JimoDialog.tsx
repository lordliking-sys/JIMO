import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useId,
  useState,
  type ReactNode,
} from 'react';
import {
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import X from 'lucide-react-native/icons/x';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import { Button, Text, animePink } from '@jimo/ui';
import { popupGeometry } from '../programs/popup-geometry';

const Focus = createContext<((input: TextInput | null) => void) | null>(null);
export const useDialogFocus = () => useContext(Focus);
type FormState = { dirty: boolean; busy: boolean };
const Forms = createContext<
  ((id: string, state: FormState | null) => void) | null
>(null);
/** Track unsaved edits and pending operations without coupling the dialog to data mutations. */
export function useDialogForm(dirty: boolean, busy: boolean) {
  const report = useContext(Forms),
    id = useId();
  useEffect(() => {
    report?.(id, { dirty, busy });
    return () => report?.(id, null);
  }, [report, id, dirty, busy]);
}
export function PopupButton({
  label,
  onPress,
  busy = false,
  outline = false,
  disabled = false,
}: {
  label: string;
  onPress(): void;
  busy?: boolean;
  outline?: boolean;
  disabled?: boolean;
}) {
  return (
    <Button
      label={label}
      onPress={onPress}
      busy={busy}
      disabled={disabled}
      variant={outline ? 'secondary' : 'primary'}
      style={{
        minHeight: 52,
        borderRadius: 26,
        paddingHorizontal: 12,
        paddingVertical: 12,
      }}
      labelStyle={{
        fontFamily: 'Inter_600SemiBold',
        fontSize: 15,
        lineHeight: 21,
      }}
    />
  );
}

/** A bounded, centered native modal. Its footer stays outside the scrollable form/list. */
export function JimoDialog({
  title,
  children,
  footer,
  close,
  visible,
  onDismiss,
  dirty: externalDirty = false,
  busy: externalBusy = false,
  scrollKey,
  back,
  backLabel,
}: {
  title: string;
  children: ReactNode;
  footer?: ReactNode | ((dismiss: () => void) => ReactNode);
  close(): void;
  visible: boolean;
  onDismiss(): void;
  dirty?: boolean;
  busy?: boolean;
  scrollKey?: string;
  back?: () => void;
  backLabel?: string;
}) {
  const { t } = useTranslation('main'),
    insets = useSafeAreaInsets(),
    { width, height } = useWindowDimensions();
  const [keyboardTop, setKeyboardTop] = useState(Number.POSITIVE_INFINITY),
    [discard, setDiscard] = useState<'close' | 'back' | null>(null);
  const [forms, setForms] = useState<Record<string, FormState>>({});
  const report = useCallback((id: string, state: FormState | null) => {
    setForms((old) => {
      const next = { ...old };
      if (state) next[id] = state;
      else delete next[id];
      return next;
    });
  }, []);
  const dirty = externalDirty || Object.values(forms).some((s) => s.dirty),
    busy = externalBusy || Object.values(forms).some((s) => s.busy);
  const geometry = popupGeometry(
    width - insets.left - insets.right,
    height,
    insets.top,
    insets.bottom,
    keyboardTop,
  );
  const reduced = useReducedMotion(),
    opacity = useSharedValue(reduced ? 1 : 0),
    scale = useSharedValue(reduced ? 1 : 0.96);
  const scroll = useRef<ScrollView>(null),
    viewport = useRef<View>(null),
    focused = useRef<TextInput | null>(null),
    offset = useRef(0);
  const reveal = useCallback(() => {
    const input = focused.current;
    if (!input) return;
    if (Platform.OS === 'web') {
      const field = input as unknown as HTMLElement;
      const port = scroll.current?.getScrollableNode() as
        HTMLElement | undefined;
      if (!port || !field.getBoundingClientRect) return;
      const bounds = field.getBoundingClientRect(),
        area = port.getBoundingClientRect();
      if (bounds.top < area.top + 8)
        port.scrollTop += bounds.top - area.top - 8;
      else if (bounds.bottom > area.bottom - 8)
        port.scrollTop += bounds.bottom - area.bottom + 8;
      offset.current = port.scrollTop;
      return;
    }
    scroll.current?.getNativeScrollRef()?.measureInWindow((_x, top, _w, h) =>
      input.measureInWindow((_ix, inputTop, _iw, ih) => {
        if (focused.current !== input) return;
        const bottom = top + h;
        const next =
          inputTop < top + 8
            ? Math.max(0, offset.current + inputTop - top - 8)
            : inputTop + ih > bottom - 8
              ? offset.current + inputTop + ih - bottom + 8
              : offset.current;
        if (Math.abs(next - offset.current) > 1) {
          offset.current = next;
          scroll.current?.scrollTo({ y: next, animated: false });
        }
      }),
    );
  }, []);
  const focus = useCallback(
    (input: TextInput | null) => {
      focused.current = input;
      requestAnimationFrame(reveal);
    },
    [reveal],
  );
  useEffect(() => {
    focused.current = null;
    scroll.current?.scrollTo({ y: 0, animated: false });
  }, [scrollKey]);
  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillChangeFrame' : 'keyboardDidShow',
      (event) => {
        setKeyboardTop(event.endCoordinates.screenY);
        requestAnimationFrame(reveal);
      },
    );
    const hide = Keyboard.addListener('keyboardDidHide', () =>
      setKeyboardTop(Number.POSITIVE_INFINITY),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, [reveal]);
  useEffect(() => {
    requestAnimationFrame(reveal);
  }, [width, height, keyboardTop, reveal]);
  useEffect(() => {
    opacity.value = reduced
      ? 1
      : withTiming(1, { duration: 200, easing: Easing.out(Easing.cubic) });
    scale.value = reduced
      ? 1
      : withTiming(1, { duration: 200, easing: Easing.out(Easing.cubic) });
  }, [opacity, scale, reduced]);
  useEffect(() => {
    if (Platform.OS !== 'web' || !visible) return;
    const root = document.getElementById('root'),
      previousHidden = root?.getAttribute('aria-hidden'),
      previousInert = root?.inert ?? false;
    root?.setAttribute('aria-hidden', 'true');
    if (root) root.inert = true;
    return () => {
      if (root) {
        root.inert = previousInert;
        if (previousHidden == null) root.removeAttribute('aria-hidden');
        else root.setAttribute('aria-hidden', previousHidden);
      }
    };
  }, [visible]);
  const panelAnimation = useAnimatedStyle(
    () => ({
      opacity: opacity.value,
      transform: [{ scale: scale.value }],
    }),
    [opacity, scale],
  );
  const fade = useAnimatedStyle(() => ({ opacity: opacity.value }), [opacity]);
  const request = (target: 'close' | 'back' = 'close') => {
    if (busy) return;
    Keyboard.dismiss();
    if (dirty) setDiscard(target);
    else if (target === 'back' && back) back();
    else close();
  };
  const dismiss = () => request('close');
  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onDismiss={onDismiss}
      onRequestClose={() =>
        discard ? setDiscard(null) : request(back ? 'back' : 'close')
      }
    >
      <>
        <Animated.View
          testID="program-popup-overlay"
          style={[{ flex: 1 }, fade]}
          accessibilityViewIsModal
        >
          <Pressable
            testID="program-popup-backdrop"
            accessible={false}
            importantForAccessibility="no"
            onPress={dismiss}
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: 'rgba(22,12,25,0.46)' },
            ]}
          />
          <View
            pointerEvents="box-none"
            style={{
              height: geometry.availableHeight,
              paddingTop: insets.top + 16,
              paddingBottom: geometry.bottomInset + 16,
              paddingLeft: insets.left + 16,
              paddingRight: insets.right + 16,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Animated.View
              testID="program-central-popup"
              style={[
                {
                  width: geometry.width,
                  maxHeight: geometry.maxHeight,
                  flexShrink: 1,
                  backgroundColor: animePink.surfaceRaised,
                  borderWidth: 1,
                  borderColor: 'rgba(242,179,206,0.7)',
                  borderRadius: 30,
                  padding: width < 360 ? 20 : 24,
                  shadowColor: '#382135',
                  shadowOpacity: 0.18,
                  shadowRadius: 24,
                  shadowOffset: { width: 0, height: 8 },
                  elevation: 14,
                },
                panelAnimation,
              ]}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  marginBottom: 8,
                  flexShrink: 0,
                }}
              >
                {back ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={backLabel ?? t('popup.back')}
                    disabled={busy}
                    onPress={() => request('back')}
                    style={{
                      width: 48,
                      height: 48,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginLeft: -12,
                    }}
                  >
                    <ChevronLeft
                      size={24}
                      color={animePink.ink}
                      accessible={false}
                    />
                  </Pressable>
                ) : null}
                <Text
                  accessibilityRole="header"
                  style={{
                    flex: 1,
                    minWidth: 0,
                    fontFamily: 'Inter_600SemiBold',
                    fontSize: 22,
                    lineHeight: 28,
                    color: animePink.ink,
                  }}
                >
                  {title}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('popup.close')}
                  disabled={busy}
                  onPress={dismiss}
                  style={{
                    width: 48,
                    height: 48,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: -12,
                  }}
                >
                  <X size={24} color={animePink.ink} accessible={false} />
                </Pressable>
              </View>
              <View
                ref={viewport}
                onLayout={() => requestAnimationFrame(reveal)}
                style={{ flexShrink: 1 }}
              >
                <ScrollView
                  ref={scroll}
                  testID="program-popup-scroll"
                  keyboardShouldPersistTaps="handled"
                  // RN Web dismisses on every scroll, including automatic field reveal.
                  keyboardDismissMode={
                    Platform.OS === 'web' ? 'none' : 'on-drag'
                  }
                  contentInsetAdjustmentBehavior="never"
                  showsVerticalScrollIndicator={false}
                  onScroll={(e) => {
                    offset.current = e.nativeEvent.contentOffset.y;
                  }}
                  scrollEventThrottle={16}
                  style={{ flexShrink: 1 }}
                  contentContainerStyle={{ gap: 18, paddingBottom: 4 }}
                >
                  <Forms.Provider value={report}>
                    <Focus.Provider value={focus}>{children}</Focus.Provider>
                  </Forms.Provider>
                </ScrollView>
              </View>
              {footer || discard ? (
                <View
                  testID="program-popup-footer"
                  style={{ paddingTop: 18, gap: 8, flexShrink: 0 }}
                >
                  {discard ? (
                    <>
                      <Text
                        accessibilityRole="alert"
                        style={{ color: animePink.ink }}
                      >
                        {t('popup.discardQuestion')}
                      </Text>
                      <PopupButton
                        label={t('popup.keepEditing')}
                        outline
                        onPress={() => setDiscard(null)}
                      />
                      <PopupButton
                        label={t('popup.discard')}
                        onPress={() => {
                          const target = discard;
                          setDiscard(null);
                          if (target === 'back' && back) back();
                          else close();
                        }}
                      />
                    </>
                  ) : typeof footer === 'function' ? (
                    footer(dismiss)
                  ) : (
                    footer
                  )}
                </View>
              ) : null}
            </Animated.View>
          </View>
        </Animated.View>
      </>
    </Modal>
  );
}
