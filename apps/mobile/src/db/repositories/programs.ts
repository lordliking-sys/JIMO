import { programDetailSchema, type ProgramDetail } from '@jimo/schemas';
import type { LocalDatabase, SqlExecutor } from '../database';
export class ProgramCacheRepository {
  private revisions = new Map<string, number>();
  constructor(private db: LocalDatabase) {}
  revision(owner: string) {
    return this.revisions.get(owner) ?? 0;
  }
  /** Apply the validated mutation response before background sync or navigation. */
  async applyDetail(owner: string, input: ProgramDetail) {
    const program = programDetailSchema.parse(input);
    this.revisions.set(owner, this.revision(owner) + 1);
    await this.db.transaction(async (sql) => {
      if (program.status === 'active')
        await sql.run(
          "UPDATE cached_programs SET status='cached' WHERE owner_user_id=? AND status='active'",
          [owner],
        );
      await this.save(sql, owner, program);
    });
  }
  async active(owner: string) {
    return this.db.access(async (sql) => {
      const row = (
        await sql.all<{ payload: string }>(
          "SELECT payload FROM cached_programs WHERE owner_user_id=? AND status='active'",
          [owner],
        )
      )[0];
      return row ? programDetailSchema.parse(JSON.parse(row.payload)) : null;
    });
  }
  async day(owner: string, id: string) {
    return this.db.access(async (sql) => {
      const row = (
        await sql.all<{ payload: string }>(
          `SELECT p.payload FROM cached_programs p JOIN cached_program_days d ON d.owner_user_id=p.owner_user_id AND d.program_id=p.id WHERE p.owner_user_id=? AND d.id=? AND p.status='active'`,
          [owner, id],
        )
      )[0];
      return row ? programDetailSchema.parse(JSON.parse(row.payload)) : null;
    });
  }
  async replaceActive(
    owner: string,
    input: ProgramDetail | null,
    expectedRevision?: number,
  ) {
    const program = input ? programDetailSchema.parse(input) : null;
    await this.db.transaction(async (sql) => {
      // A GET started before a successful edit/delete must not resurrect old data.
      if (
        expectedRevision !== undefined &&
        expectedRevision !== this.revision(owner)
      )
        return;
      await sql.run(
        "UPDATE cached_programs SET status='cached' WHERE owner_user_id=? AND status='active'",
        [owner],
      );
      if (program) await this.save(sql, owner, program);
    });
  }
  async remove(owner: string, id: string) {
    this.revisions.set(owner, this.revision(owner) + 1);
    await this.db.transaction(async (sql) => {
      await sql.run(
        'DELETE FROM cached_programs WHERE owner_user_id=? AND id=?',
        [owner, id],
      );
    });
  }
  private async save(sql: SqlExecutor, owner: string, p: ProgramDetail) {
    await sql.run(
      'INSERT INTO cached_programs VALUES(?,?,?,?) ON CONFLICT(owner_user_id,id) DO UPDATE SET status=excluded.status,payload=excluded.payload',
      [owner, p.id, p.status, JSON.stringify(p)],
    );
    await sql.run(
      'DELETE FROM cached_program_days WHERE owner_user_id=? AND program_id=?',
      [owner, p.id],
    );
    for (const day of p.days) {
      await sql.run('INSERT INTO cached_program_days VALUES(?,?,?,?)', [
        owner,
        day.id,
        p.id,
        JSON.stringify(day),
      ]);
      for (const exercise of day.exercises)
        await sql.run('INSERT INTO cached_program_exercises VALUES(?,?,?,?)', [
          owner,
          exercise.id,
          day.id,
          JSON.stringify(exercise),
        ]);
    }
  }
}
