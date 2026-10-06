import { resolve } from 'node:path';
import { readMigrationFiles } from 'drizzle-orm/migrator';
import { withDatabase } from './shared';
import { getTableConfig } from 'drizzle-orm/pg-core';
import {
  users,
  exercises,
  programs,
  programDays,
  programExercises,
  workoutSessions,
  workoutExercises,
  workoutSets,
  unitSystemEnum,
  trackingModeEnum,
  loadModeEnum,
  programStatusEnum,
  workoutStatusEnum,
  setStatusEnum,
} from '../src/schema';

const expectedTables = [
  users,
  exercises,
  programs,
  programDays,
  programExercises,
  workoutSessions,
  workoutExercises,
  workoutSets,
].map(getTableConfig);
const expectedEnums = [
  unitSystemEnum,
  trackingModeEnum,
  loadModeEnum,
  programStatusEnum,
  workoutStatusEnum,
  setStatusEnum,
];

if (!process.env.DATABASE_URL) {
  console.log(
    'Versioned migration metadata checked; live schema check skipped (DATABASE_URL missing)',
  );
} else {
  void withDatabase(async ({ sqlClient }) => {
    const [tables, enums, indexes, constraints, ledger, columns, triggers] =
      await sqlClient.transaction(
        [
          sqlClient.query(
            "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = ANY($1) ORDER BY table_name",
            [
              [
                'users',
                'exercises',
                'programs',
                'program_days',
                'program_exercises',
                'workout_sessions',
                'workout_exercises',
                'workout_sets',
              ],
            ],
          ),
          sqlClient.query(
            "SELECT t.typname FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public' AND t.typtype='e' ORDER BY t.typname",
          ),
          sqlClient.query(
            "SELECT indexname FROM pg_indexes WHERE schemaname='public' ORDER BY indexname",
          ),
          sqlClient.query(
            "SELECT constraint_name, constraint_type FROM information_schema.table_constraints WHERE table_schema='public' ORDER BY constraint_name",
          ),
          sqlClient.query(
            'SELECT hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at',
          ),
          sqlClient.query(
            "SELECT table_name, column_name, data_type, numeric_precision, numeric_scale, column_default FROM information_schema.columns WHERE table_schema='public'",
          ),
          sqlClient.query(
            "SELECT event_object_table, trigger_name FROM information_schema.triggers WHERE trigger_schema='public' AND action_statement='EXECUTE FUNCTION jimo_touch_updated_at()'",
          ),
        ],
        { readOnly: true },
      );
    const migrations = readMigrationFiles({
      migrationsFolder: resolve(__dirname, '../drizzle'),
    });
    if (
      tables?.length !== 8 ||
      ledger?.length !== migrations.length ||
      ledger.some(
        (row, i) =>
          row.hash !== migrations[i]?.hash ||
          Number(row.created_at) !== migrations[i]?.folderMillis,
      )
    )
      throw new Error('Live schema or migration ledger mismatch');
    for (const table of expectedTables) {
      const actualColumns = columns?.filter(
        (column) => column.table_name === table.name,
      );
      if (actualColumns?.length !== table.columns.length)
        throw new Error('Live column count mismatch');
      for (const column of table.columns) {
        const actual = actualColumns.find(
          (candidate) => candidate.column_name === column.name,
        );
        if (!actual) throw new Error('Live column missing');
        const type = column.getSQLType();
        if (
          table.name === 'users' &&
          column.name === 'locale' &&
          (actual.data_type !== 'text' ||
            actual.column_default !== "'system'::text")
        )
          throw new Error('Locale text/default mismatch');
        if (type === 'timestamp with time zone' && actual.data_type !== type)
          throw new Error('Audit timestamp type mismatch');
        const numeric = /^numeric\((\d+), (\d+)\)$/.exec(type);
        if (
          numeric &&
          (actual.numeric_precision !== Number(numeric[1]) ||
            actual.numeric_scale !== Number(numeric[2]))
        )
          throw new Error('Numeric precision mismatch');
        if (
          column.name === 'id' &&
          (actual.data_type !== 'uuid' ||
            actual.column_default !== 'gen_random_uuid()')
        )
          throw new Error('UUID default mismatch');
      }
      for (const index of table.indexes)
        if (!indexes?.some((actual) => actual.indexname === index.config.name))
          throw new Error('Live index missing');
      for (const check of table.checks)
        if (
          !constraints?.some((actual) => actual.constraint_name === check.name)
        )
          throw new Error('Live CHECK constraint missing');
      for (const foreignKey of table.foreignKeys)
        if (
          !constraints?.some(
            (actual) => actual.constraint_name === foreignKey.getName(),
          )
        )
          throw new Error('Live foreign key missing');
      if (
        !triggers?.some((trigger) => trigger.event_object_table === table.name)
      )
        throw new Error('Audit trigger missing');
    }
    if (
      enums?.length !== expectedEnums.length ||
      expectedEnums.some(
        (value) => !enums.some((actual) => actual.typname === value.enumName),
      )
    )
      throw new Error('Live enum mismatch');
    console.log('Neon HTTP schema check OK', {
      tables: tables.map((row) => row.table_name),
      enums: enums?.map((row) => row.typname),
      indexes: indexes?.length,
      constraints: constraints?.length,
      migrations: ledger.length,
      auditTriggers: triggers?.length,
      numericAndUuidDefaults: 'OK',
    });
  });
}
