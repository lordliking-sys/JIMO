/** Shared predicates/writes for online endpoints and the atomic sync processor.
 * Arguments are parameter placeholders generated only by application code.
 */
export function saveSetSql(gate = 'TRUE', timestamp = 'now()') {
  return `UPDATE workout_sets s SET actual_reps=$3::integer,actual_duration_seconds=$4::integer,
 actual_load_kg=$5::numeric,actual_assistance_kg=$6::numeric,actual_rpe=$7::numeric,
 status='completed',completed_at=CASE WHEN $8::boolean THEN s.completed_at ELSE ${timestamp} END,updated_at=now()
 FROM workout_exercises e,workout_sessions w WHERE s.id=$2::uuid AND e.id=s.workout_exercise_id
 AND w.id=e.workout_session_id AND w.user_id=$1::uuid AND (${gate})
 AND (CASE WHEN $8::boolean THEN s.status='completed' AND w.status IN ('in_progress','completed')
 ELSE s.status='pending' AND w.status='in_progress' END) RETURNING s.id`;
}
export function skipSetSql(gate = 'TRUE') {
  return `UPDATE workout_sets s SET status='skipped',updated_at=now() FROM workout_exercises e,workout_sessions w
 WHERE s.id=$2::uuid AND e.id=s.workout_exercise_id AND w.id=e.workout_session_id AND w.user_id=$1::uuid
 AND s.status='pending' AND w.status='in_progress' AND (${gate}) RETURNING s.id`;
}
export function finishWorkoutSql(gate = 'TRUE', timestamp = 'now()') {
  return `WITH skipped AS (
 UPDATE workout_sets s SET status='skipped',updated_at=now() FROM workout_exercises e,workout_sessions w
 WHERE s.workout_exercise_id=e.id AND e.workout_session_id=w.id AND w.id=$2::uuid
 AND w.user_id=$1::uuid AND w.status='in_progress' AND s.status='pending' AND $3::boolean AND (${gate}) RETURNING s.id
 ) UPDATE workout_sessions w SET status=$4::workout_status,completed_at=${timestamp},updated_at=now()
 WHERE w.id=$2::uuid AND w.user_id=$1::uuid AND w.status='in_progress' AND (${gate})
 AND ($3::boolean OR NOT EXISTS(SELECT 1 FROM workout_sets s JOIN workout_exercises e ON e.id=s.workout_exercise_id WHERE e.workout_session_id=w.id AND s.status='pending')) RETURNING w.id`;
}
