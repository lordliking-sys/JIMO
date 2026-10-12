/** Independent from the approved Home geometry; shared by the other sections. */
export function sectionHeroHeight(width: number, fontScale: number) {
  return Math.max(320 * Math.max(1, fontScale), Math.min(width, 560) * 0.82);
}
export function programHeroHeight(width: number, fontScale: number) {
  return Math.max(160, Math.min(width, 560) * 0.46) * Math.max(1, fontScale);
}
