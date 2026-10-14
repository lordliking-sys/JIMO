import { renderToStaticMarkup } from 'react-dom/server';
import { ProgramPopup } from '../src/programs/ProgramPopup';
import { nativePopup } from './popup-native-fixture';
export { nativePopup };
export function openPopup(dirty = false, busy = false) {
  nativePopup.close = 0;
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
      footer={null}
    >
      Fields
    </ProgramPopup>,
  );
}
