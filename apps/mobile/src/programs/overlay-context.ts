import { createContext, useContext } from 'react';
export const ProgramOverlayContext = createContext<{
  back(): void;
  title?: string;
} | null>(null);
export const useProgramOverlay = () => useContext(ProgramOverlayContext);
