import { resolve } from 'node:path';
import { migrateDatabase } from '../src/migrations';
import { withDatabase } from './shared';
import { assertDevelopment } from '../src/development';

void withDatabase(async (client) => {
  await assertDevelopment(client);
  const result = await migrateDatabase(
    client,
    resolve(__dirname, '../drizzle'),
  );
  console.log('Neon HTTP migrations complete', result);
});
