import type {
  exercises,
  programExercises,
  workoutExercises,
  workoutSets,
} from './schema';
type Prescription = typeof programExercises.$inferSelect;
type Exercise = typeof exercises.$inferSelect;
export function snapshotExercise(
  source: Prescription,
  exercise: Exercise,
  sessionId: string,
): typeof workoutExercises.$inferInsert {
  if (source.exerciseId !== exercise.id)
    throw new Error('Snapshot source exercise mismatch');
  if (
    exercise.trackingMode === 'duration' &&
    (source.targetReps !== null || source.targetRepMin !== null)
  )
    throw new Error('Duration exercise cannot have repetition targets');
  if (exercise.trackingMode === 'reps' && source.targetDurationSeconds !== null)
    throw new Error('Repetition exercise cannot have duration targets');
  return {
    workoutSessionId: sessionId,
    programExerciseId: source.id,
    exerciseId: exercise.id,
    position: source.position,
    exerciseNameSnapshot: exercise.canonicalName,
    trackingModeSnapshot: exercise.trackingMode,
    loadModeSnapshot: source.loadMode,
    restSecondsSnapshot: source.restSeconds,
    notes: source.notes,
  };
}
export function snapshotSets(
  source: Prescription,
  workoutExerciseId: string,
): (typeof workoutSets.$inferInsert)[] {
  return Array.from({ length: source.targetSets }, (_, index) => ({
    workoutExerciseId,
    setNumber: index + 1,
    status: 'pending',
    targetReps: source.targetReps,
    targetRepMin: source.targetRepMin,
    targetRepMax: source.targetRepMax,
    targetDurationSeconds: source.targetDurationSeconds,
    targetLoadKg: source.targetLoadKg,
    targetAssistanceKg: source.targetAssistanceKg,
    targetRpe: source.targetRpe,
    actualReps: null,
    actualDurationSeconds: null,
    actualLoadKg: null,
    actualAssistanceKg: null,
    actualRpe: null,
  }));
}
