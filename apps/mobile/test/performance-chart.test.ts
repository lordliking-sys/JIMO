import test from 'node:test';
import assert from 'node:assert/strict';
import type { ExerciseModeMetrics } from '@jimo/schemas';
import {
  chronologicalSessions,
  observation,
  observedSegments,
  performanceLanes,
  performanceScale,
  type SessionPoint,
} from '../src/progress-profile/performance-chart';
test('chart scales include all observations, keep reps integer and handle constant/zero observations', () => {
  for (const values of [
    [8, 10, 13],
    [0, 0],
    [80, 80],
    [80, 82.5, 85],
  ]) {
    const scale = performanceScale(values, false)!;
    assert.ok(scale.low <= Math.min(...values));
    assert.ok(scale.high >= Math.max(...values));
    assert.ok(scale.high > scale.low);
  }
  assert.ok(performanceScale([8, 13], true)!.ticks.every(Number.isInteger));
});
test('missing chart data remains missing and breaks lines instead of becoming zero', () => {
  assert.equal(performanceScale([null, null], false), null);
  assert.deepEqual(observedSegments([10, null, 30, 40]), [
    [{ index: 0, value: 10 }],
    [
      { index: 2, value: 30 },
      { index: 3, value: 40 },
    ],
  ]);
  assert.equal(
    observation({ maxLoadKg: null } as SessionPoint, 'maxLoadKg'),
    null,
  );
  assert.equal(
    observation({ maxLoadKg: '0.00' } as SessionPoint, 'maxLoadKg'),
    0,
  );
});
test('load and assistance are distinct, bodyweight has no fabricated strength curve and duration uses seconds', () => {
  const mode = (
    loadMode: ExerciseModeMetrics['loadMode'],
    trackingMode: ExerciseModeMetrics['trackingMode'],
  ) => ({ loadMode, trackingMode }) as ExerciseModeMetrics;
  assert.deepEqual(
    performanceLanes(mode('weighted', 'reps')).map((lane) => lane.key),
    ['maxLoadKg', 'maxReps'],
  );
  assert.deepEqual(
    performanceLanes(mode('assisted', 'reps')).map((lane) => lane.key),
    ['minAssistanceKg', 'maxReps'],
  );
  assert.deepEqual(
    performanceLanes(mode('bodyweight', 'reps')).map((lane) => lane.key),
    ['maxReps'],
  );
  assert.deepEqual(
    performanceLanes(mode('bodyweight', 'duration')).map((lane) => lane.key),
    ['maxDurationSeconds'],
  );
});
test('session chronology uses timestamps without mutating the cached response', () => {
  const points = [
    { sessionId: 'b', date: '2026-10-09T10:00:00Z' },
    { sessionId: 'a', date: '2026-10-05T10:00:00Z' },
  ] as SessionPoint[];
  assert.deepEqual(
    chronologicalSessions(points).map((point) => point.sessionId),
    ['a', 'b'],
  );
  assert.equal(points[0]!.sessionId, 'b');
});
