import { resolve } from 'node:path';
import { migrateDatabase } from '../src/migrations';
import { withDatabase } from './shared';

void withDatabase(async (client) => {
  const result = await migrateDatabase(
    client,
    resolve(__dirname, '../drizzle'),
  );
  console.log('Neon HTTP migrations complete', result);
});
