import { createDatabase, safeDatabaseError } from '../src/client';

export async function withDatabase(
  action: (client: ReturnType<typeof createDatabase>) => Promise<void>,
) {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is required');
    process.exitCode = 1;
    return;
  }
  let client: ReturnType<typeof createDatabase> | undefined;
  try {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL is required');
    client = createDatabase(url);
    await action(client);
  } catch (error) {
    console.error('Database command failed', safeDatabaseError(error));
    process.exitCode = 1;
  } finally {
    try {
      await client?.close();
    } catch (error) {
      console.error(
        'Database transport shutdown failed',
        safeDatabaseError(error),
      );
      process.exitCode = 1;
    }
  }
}
