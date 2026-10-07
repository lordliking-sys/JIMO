export type MainTab = 'home' | 'program' | 'workout' | 'progress' | 'profile';
/** Shorten the visible caption before it can wrap; screen-reader names stay full. */
export function tabLabelKey(tab: MainTab, width: number, fontScale: number) {
  if (tab === 'program')
    return fontScale > 1.35 || width < 300
      ? 'short.program'
      : 'compact.program';
  if (tab === 'workout')
    return fontScale > 1.2 || width < 320 ? 'short.workout' : 'compact.workout';
  if (tab === 'progress')
    return fontScale > 1.05 || width < 320 ? 'compact.progress' : 'progress';
  if (tab === 'profile')
    return fontScale > 1.35 || width < 300 ? 'short.profile' : 'profile';
  return 'home';
}
