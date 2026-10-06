import { and, eq, inArray } from 'drizzle-orm';
import { exercises } from '../src/schema';
import { withDatabase } from './shared';

const entries = [
  ['Push-Up', 'push-up', 'reps', 'bodyweight'],
  ['Pull-Up', 'pull-up', 'reps', 'bodyweight'],
  ['Dip', 'dip', 'reps', 'bodyweight'],
  ['Squat', 'squat', 'reps', 'external'],
  ['Bench Press', 'bench-press', 'reps', 'external'],
  ['Deadlift', 'deadlift', 'reps', 'external'],
  ['Barbell Row', 'barbell-row', 'reps', 'external'],
  ['Overhead Press', 'overhead-press', 'reps', 'external'],
  ['Plank', 'plank', 'duration', 'bodyweight'],
  ['Lunge', 'lunge', 'reps', 'bodyweight'],
  ['Lat Pulldown', 'lat-pulldown', 'reps', 'external'],
  ['Dumbbell Curl', 'dumbbell-curl', 'reps', 'external'],
] as const;

if (
  process.env.NODE_ENV !== 'development' ||
  process.env.ALLOW_DEV_SEED !== '1'
) {
  console.error(
    'Development seed requires NODE_ENV=development and ALLOW_DEV_SEED=1',
  );
  process.exitCode = 1;
} else {
  void withDatabase(async ({ db }) => {
    const inserted = await db
      .insert(exercises)
      .values(
        entries.map(([canonicalName, slug, trackingMode, defaultLoadMode]) => ({
          canonicalName,
          slug,
          trackingMode,
          defaultLoadMode,
          isCustom: false,
          createdByUserId: null,
        })),
      )
      .onConflictDoNothing()
      .returning({ id: exercises.id });
    const present = await db
      .select({ id: exercises.id })
      .from(exercises)
      .where(
        and(
          eq(exercises.isCustom, false),
          inArray(
            exercises.slug,
            entries.map((entry) => entry[1]),
          ),
        ),
      );
    if (present.length !== entries.length)
      throw new Error('Development seed incomplete');
    console.log('Development exercises seed OK', {
      inserted: inserted.length,
      present: present.length,
    });
  });
}
