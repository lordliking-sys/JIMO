import { useEffect, useRef, type ReactNode } from 'react';
import { View, AccessibilityInfo } from 'react-native';
import Check from 'lucide-react-native/icons/check';
import { useTranslation } from 'react-i18next';
import { useReducedMotion } from 'react-native-reanimated';
import type { WorkoutDetail, WorkoutExercise } from '@jimo/schemas';
import { emomClock } from '../modes';
import { useWorkoutActions, useWorkoutMutation } from '../queries';
import { setSummary } from '../helpers';
import { workoutHaptic } from '../haptics';
import { WorkoutSurface, InkText } from './Surface';
import { EnsoTimer, InkButton, ExerciseHero } from './components';
import { ink } from './theme';
import { ErrorNotice } from '../../programs/components';

export function PyramidSetTimeline({
  exercise,
  currentId,
}: {
  exercise: WorkoutExercise;
  currentId: string;
}) {
  const { t, i18n } = useTranslation('workouts');
  return (
    <View
      testID="pyramid-live-timeline"
      style={{
        gap: 4,
        width: '100%',
        borderTopWidth: 1,
        borderColor: ink.border,
        paddingTop: 8,
      }}
    >
      {exercise.sets.map((s) => {
        const value = setSummary(
          exercise,
          s,
          i18n.resolvedLanguage ?? 'it',
          s.status === 'completed',
        );
        return (
          <View
            key={s.id}
            accessible
            accessibilityLabel={`${t('set')} ${s.setNumber} · ${t(s.status === 'completed' ? 'completed' : s.id === currentId ? 'current' : 'pending')}`}
            style={{
              minHeight: 48,
              padding: 10,
              borderRadius: 12,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              backgroundColor: s.id === currentId ? ink.surface : 'transparent',
              borderWidth: s.id === currentId ? 1 : 0,
              borderColor: ink.sage,
            }}
          >
            <InkText
              style={{
                fontSize: 21,
                color: s.id === currentId ? ink.sage : ink.secondary,
              }}
            >
              {String(s.setNumber).padStart(2, '0')}
            </InkText>
            <InkText style={{ flex: 1, fontSize: 22 }}>
              {value.target}
              {value.load ? ` × ${value.load} kg` : ''}
            </InkText>
            {s.status === 'completed' ? (
              <Check color={ink.sage} size={22} />
            ) : null}
          </View>
        );
      })}
    </View>
  );
}
export function EmomWorkout({
  workout,
  exercise,
  now,
  header,
}: {
  workout: WorkoutDetail;
  exercise: WorkoutExercise;
  now: number;
  header: ReactNode;
}) {
  const { t } = useTranslation('workouts'),
    api = useWorkoutActions(),
    reduced = useReducedMotion();
  const clock = emomClock(exercise, now);
  const start = useWorkoutMutation(() =>
    api.startEmom(workout.id, exercise.id),
  );
  const advance = useWorkoutMutation(() =>
    api.advanceEmom(workout.id, exercise.id),
  );
  const cue = useRef<string | null>(null);
  const needsReconcile = exercise.sets.some(
    (s, i) => i < clock.completedRounds && s.status === 'pending',
  );
  useEffect(() => {
    if (needsReconcile && !advance.isPending && !advance.error)
      advance.mutate(undefined);
  }, [needsReconcile, advance]);
  useEffect(() => {
    if (!clock.started || clock.preparing) return;
    const key = `${exercise.id}:${clock.finished ? 'finished' : clock.index}`;
    if (cue.current === key) return;
    const firstObservation = cue.current === null;
    cue.current = key;
    if (!firstObservation || clock.index === 0 || clock.finished) {
      workoutHaptic(clock.finished ? 'set' : 'rest', reduced);
      AccessibilityInfo.announceForAccessibility(
        t(clock.finished ? 'emom.finished' : 'emom.round', {
          current: clock.index + 1,
          total: exercise.sets.length,
        }),
      );
    }
  }, [
    clock.started,
    clock.preparing,
    clock.index,
    clock.finished,
    exercise.id,
    exercise.sets.length,
    reduced,
    t,
  ]);
  const current = exercise.sets[clock.index]!;
  return (
    <WorkoutSurface variant="emom" centered>
      <View
        testID="emom-live"
        style={{ width: '100%', gap: 14, alignItems: 'center' }}
      >
        {header}
        <ExerciseHero compact name={exercise.exerciseNameSnapshot} />
        {clock.preparing ? (
          <InkText style={{ fontSize: 26, letterSpacing: 2 }}>
            {t('emom.prepare')}
          </InkText>
        ) : null}
        <EnsoTimer
          brush
          remaining={clock.remaining}
          total={clock.preparing ? 10 : clock.interval}
          {...(clock.deadline && !clock.finished
            ? { deadline: clock.deadline }
            : {})}
          secondsOnly={clock.preparing}
          label={clock.preparing ? t('emom.prepare') : 'EMOM'}
        />
        {!clock.preparing ? (
          <InkText accessibilityLiveRegion="polite" style={{ fontSize: 24 }}>
            {clock.finished
              ? t('emom.finished')
              : t('emom.round', {
                  current: clock.index + 1,
                  total: exercise.sets.length,
                })}
          </InkText>
        ) : null}
        {!clock.finished && !clock.preparing ? (
          <InkText
            testID="emom-target-reps"
            style={{ fontSize: 34, color: ink.parchment }}
          >
            {current.targetReps} {t('reps').toUpperCase()}
          </InkText>
        ) : null}
        {!clock.started ? (
          <InkButton
            primary
            label={t('emom.start')}
            disabled={start.isPending}
            onPress={() => start.mutate(undefined)}
          />
        ) : null}
        {start.error ? <ErrorNotice error={start.error} /> : null}
        {advance.error ? (
          <ErrorNotice
            error={advance.error}
            retry={() => advance.mutate(undefined)}
          />
        ) : null}
        <View
          testID="emom-round-grid"
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'center',
            alignSelf: 'center',
            gap: 8,
            width: '100%',
            maxWidth: 5 * 40 + 4 * 8,
          }}
        >
          {exercise.sets.map((s, i) => {
            const completed = i < clock.completedRounds,
              active =
                clock.started &&
                !clock.preparing &&
                !clock.finished &&
                i === clock.index;
            return (
              <View
                key={s.id}
                accessible
                accessibilityLabel={`${t('emom.roundLabel')} ${s.setNumber} · ${t(completed ? 'completed' : active ? 'current' : 'pending')}`}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  borderWidth: active ? 2 : 1,
                  borderColor: active ? ink.sage : ink.border,
                  backgroundColor: active ? ink.surface : 'transparent',
                  opacity: completed || active ? 1 : 0.5,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {completed ? (
                  <Check size={20} color={ink.sage} />
                ) : (
                  <InkText
                    style={{
                      fontSize: 20,
                      color: active ? ink.sage : ink.secondary,
                    }}
                  >
                    {String(s.setNumber).padStart(2, '0')}
                  </InkText>
                )}
              </View>
            );
          })}
        </View>
      </View>
    </WorkoutSurface>
  );
}
