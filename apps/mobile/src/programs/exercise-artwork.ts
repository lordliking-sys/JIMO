import type { ExerciseDto } from '@jimo/schemas';
export type ExerciseArtworkVariant = 'male' | 'female';
export type ExerciseArtworkKey =
  | 'dip'
  | 'pull_up'
  | 'hollow_hold'
  | 'plank'
  | 'squat'
  | 'glute_bridge'
  | 'push_up'
  | 'lunge'
  | 'stretching'
  | 'leg_raise';
export const exerciseArtworkFiles = {
  male: {
    dip: 'exercise-art/male/dip.png',
    pull_up: 'exercise-art/male/pull_up.png',
    hollow_hold: 'exercise-art/male/hollow_hold.png',
    plank: 'exercise-art/male/plank.png',
    squat: 'exercise-art/male/squat.png',
    glute_bridge: 'exercise-art/male/glute_bridge.png',
    push_up: 'exercise-art/male/push_up.png',
    lunge: 'exercise-art/male/lunge.png',
    stretching: 'exercise-art/male/stretching.png',
    leg_raise: 'exercise-art/male/leg_raise.png',
  },
  female: {
    dip: 'exercise-art/female/dip.png',
    pull_up: 'exercise-art/female/pull_up.png',
    hollow_hold: 'exercise-art/female/hollow_hold.png',
    plank: 'exercise-art/female/plank.png',
    squat: 'exercise-art/female/squat.png',
    leg_raise: 'exercise-art/female/leg_raise.png',
    lunge: 'exercise-art/female/lunge.png',
    stretching: 'exercise-art/female/stretching.png',
  },
} as const;
const aliases: Readonly<Record<string, ExerciseArtworkKey>> = {
  dip: 'dip',
  dips: 'dip',
  'pull up': 'pull_up',
  'pull ups': 'pull_up',
  trazioni: 'pull_up',
  'push up': 'push_up',
  'push ups': 'push_up',
  piegamenti: 'push_up',
  flessioni: 'push_up',
  'hollow hold': 'hollow_hold',
  plank: 'plank',
  squat: 'squat',
  'glute bridge': 'glute_bridge',
  'ponte glutei': 'glute_bridge',
  lunge: 'lunge',
  lunges: 'lunge',
  affondi: 'lunge',
  stretching: 'stretching',
  'leg raise': 'leg_raise',
  'leg raises': 'leg_raise',
  'sollevamento gambe': 'leg_raise',
};
export function exerciseArtworkKey(
  exercise: Pick<ExerciseDto, 'canonicalName' | 'isCustom'>,
): ExerciseArtworkKey | null {
  if (exercise.isCustom) return null;
  const name = exercise.canonicalName
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ');
  return aliases[name] ?? null;
}
export function exerciseArtworkFile(
  exercise: Pick<ExerciseDto, 'canonicalName' | 'isCustom'>,
  variant: ExerciseArtworkVariant = 'male',
): string | null {
  const key = exerciseArtworkKey(exercise);
  const files: Partial<Record<ExerciseArtworkKey, string>> =
    exerciseArtworkFiles[variant];
  return key ? (files[key] ?? null) : null;
}
