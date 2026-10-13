import { useEffect, type ReactNode } from 'react';
import { Keyboard, Modal, Platform, View } from 'react-native';
import { ProgramOverlayContext } from './overlay-context';
import { programInk } from './presentation';
/** A single native modal hosts the action stack; the parent destination stays mounted. */
export function ProgramOverlay({
  children,
  back,
  title,
}: {
  children: ReactNode;
  back(): void;
  title?: string;
}) {
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const root = document.getElementById('root');
    const previousHidden = root?.getAttribute('aria-hidden');
    const previousInert = root?.inert ?? false;
    root?.setAttribute('aria-hidden', 'true');
    if (root) root.inert = true;
    return () => {
      if (root) {
        root.inert = previousInert;
        if (previousHidden === null || previousHidden === undefined)
          root.removeAttribute('aria-hidden');
        else root.setAttribute('aria-hidden', previousHidden);
      }
    };
  }, []);
  return (
    <Modal
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={() => {
        Keyboard.dismiss();
        back();
      }}
    >
      <ProgramOverlayContext.Provider
        value={{ back, ...(title ? { title } : {}) }}
      >
        <View
          testID="program-action-overlay"
          accessibilityViewIsModal
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.48)',
            paddingTop: 12,
          }}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: programInk.background,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              overflow: 'hidden',
            }}
          >
            {children}
          </View>
        </View>
      </ProgramOverlayContext.Provider>
    </Modal>
  );
}
