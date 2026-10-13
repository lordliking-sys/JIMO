import type { ImageSourcePropType } from 'react-native';
export type AnimeAssetSlot =
  | 'home.hero'
  | 'program.hero'
  | 'progress.hero'
  | 'profile.hero'
  | 'workout.hero'
  | 'workout.standard'
  | 'workout.emom'
  | 'workout.pyramid';
/** Register supplied separate originals here with literal require paths. No mockup/folklore fallback. */
export const animePinkAssets: Record<
  AnimeAssetSlot,
  ImageSourcePropType | null
> = {
  'home.hero': null,
  'program.hero': null,
  'progress.hero': null,
  'profile.hero': null,
  'workout.hero': null,
  'workout.standard': null,
  'workout.emom': null,
  'workout.pyramid': null,
};
