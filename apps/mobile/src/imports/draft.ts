import {
  prescriptionFor,
  importDraftSchema,
  importConfirmationSchema,
  type ImportReview,
  type ImportDraft,
  type ImportDraftExercise,
} from '@jimo/schemas';
import type { LocalDatabase } from '../db/database';
export function reviewToDraft(
  review: ImportReview,
  uuid: () => string,
): ImportDraft {
  return importDraftSchema.parse({
    version: 1,
    importId: review.importId,
    confirmationKey: uuid(),
    warnings: review.extraction.warnings,
    program: {
      name: review.extraction.programName ?? '',
      description: review.extraction.description,
      durationWeeks: review.extraction.durationWeeks,
      startsOn: null,
    },
    days: review.extraction.days.map((day, i) => ({
      localId: uuid(),
      name: day.name ?? '',
      dayOfWeek: day.dayOfWeek,
      notes: day.notes,
      exercises: day.exercises.map((e, j) => ({
        localId: uuid(),
        rawName: e.rawName,
        confidence: e.confidence,
        match: review.matches[i]![j]!,
        exercise:
          review.matches[i]![j]!.status === 'MATCHED'
            ? review.matches[i]![j]!.exercise
            : null,
        custom: null,
        prescription: {
          loadMode: e.loadMode,
          targetSets: e.sets,
          targetReps: e.reps,
          targetRepMin: e.repMin,
          targetRepMax: e.repMax,
          targetDurationSeconds: e.durationSeconds,
          targetLoadKg: e.loadKg,
          targetAssistanceKg: e.assistanceKg,
          targetRpe: e.rpe,
          restSeconds: e.restSeconds,
          notes:
            [e.notes, e.rawPrescription]
              .filter(Boolean)
              .filter((v, i, a) => a.indexOf(v) === i)
              .join('\n')
              .slice(0, 2000) || null,
        },
      })),
    })),
  });
}
export function draftConfirmation(draft: ImportDraft) {
  return importConfirmationSchema.parse({
    confirmationKey: draft.confirmationKey,
    importId: draft.importId,
    program: draft.program,
    days: draft.days.map((d) => ({
      name: d.name,
      dayOfWeek: d.dayOfWeek ?? null,
      notes: d.notes ?? null,
      exercises: d.exercises.map((e) => ({
        exerciseId: e.custom ? null : (e.exercise?.id ?? null),
        custom: e.custom,
        prescription: e.prescription,
      })),
    })),
  });
}
export function incompleteItem(item: ImportDraftExercise) {
  const exercise = item.exercise ?? item.custom;
  if (!exercise) return true;
  return !prescriptionFor(exercise.trackingMode).safeParse({
    ...item.prescription,
    exerciseId: item.exercise?.id ?? item.localId,
  }).success;
}
export class ImportDraftRepository {
  private key: string;
  constructor(
    private db: LocalDatabase,
    deployment: string,
  ) {
    this.key = 'workout-plan-import:' + deployment;
  }
  async read(owner: string): Promise<ImportDraft | null> {
    return this.db.access(async (sql) => {
      const row = (
        await sql.all<{ value: string }>(
          'SELECT value FROM sync_metadata WHERE owner_user_id=? AND key=?',
          [owner, this.key],
        )
      )[0];
      if (!row) return null;
      try {
        return importDraftSchema.parse(JSON.parse(row.value));
      } catch {
        return null;
      }
    });
  }
  async save(owner: string, draft: ImportDraft) {
    const json = JSON.stringify(importDraftSchema.parse(draft));
    if (json.length > 1024 * 1024) throw new Error('IMPORT_REVIEW_TOO_LARGE');
    await this.db.access((sql) =>
      sql.run(
        'INSERT INTO sync_metadata VALUES(?,?,?) ON CONFLICT(owner_user_id,key) DO UPDATE SET value=excluded.value',
        [owner, this.key, json],
      ),
    );
  }
  async discard(owner: string) {
    await this.db.access((sql) =>
      sql.run('DELETE FROM sync_metadata WHERE owner_user_id=? AND key=?', [
        owner,
        this.key,
      ]),
    );
  }
}
