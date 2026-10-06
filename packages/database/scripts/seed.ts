import { and, eq, inArray } from 'drizzle-orm';
import { exercises, exerciseTranslations } from '../src/schema';
import { withDatabase } from './shared';
import { assertDevelopment } from '../src/development';

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
  void withDatabase(async (client) => {
    await assertDevelopment(client);
    const { db } = client;
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
      .select({
        id: exercises.id,
        slug: exercises.slug,
        canonicalName: exercises.canonicalName,
      })
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
    const italian: Record<string, string> = {
      'push-up': 'Piegamenti',
      'pull-up': 'Trazioni',
      dip: 'Dip',
      squat: 'Squat',
      'bench-press': 'Panca piana',
      deadlift: 'Stacco da terra',
      'barbell-row': 'Rematore con bilanciere',
      'overhead-press': 'Military Press',
      plank: 'Plank',
      lunge: 'Affondi',
      'lat-pulldown': 'Lat machine',
      'dumbbell-curl': 'Curl con manubri',
    };
    const translated = await db
      .insert(exerciseTranslations)
      .values(
        present.flatMap((r) => [
          {
            exerciseId: r.id,
            locale: 'it',
            name: italian[r.slug ?? ''] ?? r.canonicalName,
          },
          { exerciseId: r.id, locale: 'en', name: r.canonicalName },
        ]),
      )
      .onConflictDoNothing()
      .returning({ exerciseId: exerciseTranslations.exerciseId });
    const translations = await db
      .select()
      .from(exerciseTranslations)
      .where(
        and(
          inArray(
            exerciseTranslations.exerciseId,
            present.map((r) => r.id),
          ),
          inArray(exerciseTranslations.locale, ['it', 'en']),
        ),
      );
    if (translations.length !== 24)
      throw new Error('Exercise translations incomplete');
    console.log('Development exercises seed OK', {
      inserted: inserted.length,
      present: present.length,
      translationsInserted: translated.length,
      translationsPresent: translations.length,
    });
  });
}
