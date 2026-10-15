import { JimoDialog, useDialogFocus } from '../components/JimoDialog';
import { ProgramPresentationProvider } from './presentation';
export { PopupButton } from '../components/JimoDialog';
const noop = () => {};
export const usePopupFocus = () => useDialogFocus() ?? noop;
/** Compatibility wrapper for the shared central dialog and existing program field styling. */
export function ProgramPopup(props: React.ComponentProps<typeof JimoDialog>) {
  return (
    <ProgramPresentationProvider value={true}>
      <JimoDialog {...props} />
    </ProgramPresentationProvider>
  );
}
