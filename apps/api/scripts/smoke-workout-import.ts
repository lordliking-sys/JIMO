import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { eq } from 'drizzle-orm';
import {
  createDatabase,
  assertDevelopment,
  users,
  safeDatabaseError,
} from '@jimo/database';
import { OpenAIWorkoutPlanExtractor } from '../src/ai/client';
import { WorkoutPlanImportService } from '../src/ai/imports/workoutPlanImport';
import { validateImportFile } from '../src/ai/imports/files';
import { readEnv } from '../src/env';
import { ApiError } from '../src/errors';
async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.log(
      'Real OpenAI smoke pending: OPENAI_API_KEY missing; no provider request made',
    );
    return;
  }
  const env = readEnv(),
    client = createDatabase(env.DATABASE_URL),
    userId = randomUUID();
  let verified = false,
    extractor: OpenAIWorkoutPlanExtractor | undefined;
  try {
    await assertDevelopment(client, env.NEON_DEVELOPMENT_BRANCH_ID);
    verified = true;
    await client.db
      .insert(users)
      .values({ id: userId, displayName: 'JIMO_OPENAI_SMOKE_SYNTHETIC' });
    extractor = new OpenAIWorkoutPlanExtractor(
      env.OPENAI_IMPORT_MODEL,
      env.OPENAI_API_KEY!,
    );
    const file = await validateImportFile(
      'image/jpeg',
      'synthetic.jpg',
      await readFile(
        resolve(__dirname, '../test/fixtures/imports/printed-plan.jpg'),
      ),
    );
    const review = await new WorkoutPlanImportService(
      client,
      extractor,
      env.OPENAI_IMPORT_MODEL,
    ).extract(userId, [file], 'it');
    console.log('Real OpenAI structured output valid', {
      days: review.extraction.days.length,
      exercises: review.extraction.days.reduce(
        (n, d) => n + d.exercises.length,
        0,
      ),
      programCreated: false,
    });
  } finally {
    await extractor?.close();
    if (verified) await client.db.delete(users).where(eq(users.id, userId));
    await client.close();
  }
}
void main().catch((error) => {
  console.error(
    'Real OpenAI smoke failed',
    error instanceof ApiError ? { code: error.code } : safeDatabaseError(error),
  );
  process.exitCode = 1;
});
