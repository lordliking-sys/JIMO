import { renderToStaticMarkup } from 'react-dom/server';
import { ProgramPopup } from '../src/programs/ProgramPopup';
import { ProgramOverlay } from '../src/programs/ProgramOverlay';
import { nativePopup } from './popup-native-fixture';
export { nativePopup };
export function openPopup(dirty = false, busy = false, back = false) {
  nativePopup.close = 0;
  nativePopup.back = 0;
  nativePopup.keyboardVisible = false;
  nativePopup.keyboardDismissals = 0;
  nativePopup.buttons = [];
  renderToStaticMarkup(
    <ProgramPopup
      title="New plan"
      visible
      onDismiss={() => {}}
      close={() => nativePopup.close++}
      dirty={dirty}
      busy={busy}
      {...(back ? { back: () => nativePopup.back++ } : {})}
      footer={null}
    >
      Fields
    </ProgramPopup>,
  );
}
export function openOverlay() {
  nativePopup.close = 0;
  nativePopup.back = 0;
  nativePopup.keyboardDismissals = 0;
  nativePopup.keyboardVisible = false;
  renderToStaticMarkup(
    <ProgramOverlay back={() => nativePopup.back++}>Fields</ProgramOverlay>,
  );
}
