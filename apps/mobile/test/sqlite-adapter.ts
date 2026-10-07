import { DatabaseSync } from 'node:sqlite';
import { LocalDatabase, type SqlExecutor } from '../src/db/database';
export function sqliteAdapter(path = ':memory:') {
  const sqlite = new DatabaseSync(path);
  const adapter: SqlExecutor = {
    exec: async (s) => {
      sqlite.exec(s);
    },
    run: async (s, p = []) => {
      sqlite.prepare(s).run(...p);
    },
    all: async <T>(s: string, p = []) => sqlite.prepare(s).all(...p) as T[],
  };
  return { sqlite, adapter, db: new LocalDatabase(adapter) };
}
