import { animePink } from '@jimo/ui';
import { tabArtwork } from '../components/tab-artwork';
/** Compatibility names for the existing presentation components; all values use anime-pink. */
export const mainInk = {
  charcoal: animePink.ink,
  parchment: animePink.white,
  ivory: animePink.background,
  green: animePink.primaryText,
  sage: animePink.primaryPink,
  muted: animePink.textSecondary,
  darkMuted: animePink.textSecondary,
  border: animePink.border,
  paperBorder: animePink.border,
  paperSurface: animePink.surface,
  darkSurface: animePink.surfaceSoft,
};
export const mainArtwork = {
  home: tabArtwork.home,
  program: tabArtwork.program,
};
