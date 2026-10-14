import type { ImageSourcePropType } from 'react-native';
export type AnimeAssetSlot =
  | 'home.hero'
  | 'program.hero'
  | 'progress.hero'
  | 'profile.hero'
  | 'profile.character'
  | 'workout.hero'
  | 'workout.standard'
  | 'workout.emom'
  | 'workout.pyramid';
/** Register supplied separate originals here with literal require paths. No mockup/folklore fallback. */
export const animePinkAssets: Record<
  AnimeAssetSlot,
  ImageSourcePropType | null
> = {
  'home.hero': require('../../../assets/jimo/anime-theme/home-hero-reference.png'),
  'program.hero': require('../../../assets/jimo/anime-theme/profilo-mood-reference.png'),
  'progress.hero': require('../../../assets/jimo/anime-theme/progressi-hero-reference.png'),
  'profile.hero': require('../../../assets/jimo/anime-theme/profilo-terrace-background.png'),
  'profile.character': require('../../../assets/jimo/anime-theme/profilo-character-overlay.png'),
  'workout.hero': null,
  'workout.standard': null,
  'workout.emom': null,
  'workout.pyramid': null,
};
