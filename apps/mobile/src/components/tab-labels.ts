export type MainTab = 'home' | 'program' | 'workout' | 'progress' | 'profile';
/** Captions remain stable; layout accommodates narrow widths and larger text. */
export function tabLabelKey(tab: MainTab, _width: number, _fontScale: number) {
  return tab === 'program' || tab === 'workout'
    ? (`compact.${tab}` as const)
    : tab;
}
