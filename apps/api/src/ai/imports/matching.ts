import type {
  ExerciseDto,
  ImportMatch,
  ExtractedExercise,
} from '@jimo/schemas';
export type CatalogExercise = ExerciseDto & { names: string[] };
export function normalizeExerciseName(name: string) {
  return name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\b(pull ups|pull up|pullups)\b/g, 'pullup')
    .replace(/\bdips\b/g, 'dip');
}
const similarity = (a: string, b: string) => {
  const x = new Set(a.split(' ')),
    y = new Set(b.split(' '));
  return (
    [...x].filter((w) => y.has(w)).length / (new Set([...x, ...y]).size || 1)
  );
};
export function matchExercise(
  item: ExtractedExercise,
  catalog: CatalogExercise[],
): ImportMatch {
  const name = normalizeExerciseName(item.rawName ?? '');
  if (!name) return { status: 'UNMATCHED', exercise: null, suggestions: [] };
  const candidates = catalog
    .map((e) => ({
      exercise: e,
      exact: [e.canonicalName, ...e.names].some(
        (n) => normalizeExerciseName(n) === name,
      ),
      score: Math.max(
        ...[e.canonicalName, ...e.names].map((n) => {
          const k = normalizeExerciseName(n);
          return k === name ? 1 : similarity(name, k);
        }),
      ),
    }))
    .filter((e) => e.score >= 0.5)
    .sort(
      (a, b) => b.score - a.score || a.exercise.id.localeCompare(b.exercise.id),
    );
  const exact = candidates.filter((e) => e.exact),
    strip = (e: CatalogExercise): ExerciseDto => ({
      id: e.id,
      displayName: e.displayName,
      canonicalName: e.canonicalName,
      trackingMode: e.trackingMode,
      defaultLoadMode: e.defaultLoadMode,
      isCustom: e.isCustom,
    });
  if (exact.length === 1)
    return {
      status: 'MATCHED',
      exercise: strip(exact[0]!.exercise),
      suggestions: [],
    };
  return candidates.length
    ? {
        status: 'SUGGESTED',
        exercise: null,
        suggestions: candidates.slice(0, 3).map((e) => strip(e.exercise)),
      }
    : { status: 'UNMATCHED', exercise: null, suggestions: [] };
}
