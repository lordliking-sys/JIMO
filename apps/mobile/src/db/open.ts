import { openDatabaseAsync } from 'expo-sqlite';
import { LocalDatabase, type SqlExecutor } from './database';
let opened: Promise<LocalDatabase> | undefined;
export function openLocalDatabase() {
  opened ??= (async () => {
    const db = await openDatabaseAsync('jimo-workouts.db');
    const sql: SqlExecutor = {
      exec: (s) => db.execAsync(s),
      run: async (s, p = []) => {
        await db.runAsync(s, p);
      },
      all: <T>(s: string, p: import('./database').Value[] = []) =>
        db.getAllAsync<T>(s, p),
    };
    const local = new LocalDatabase(sql);
    await local.migrate();
    return local;
  })().catch((e) => {
    opened = undefined;
    throw e;
  });
  return opened;
}
