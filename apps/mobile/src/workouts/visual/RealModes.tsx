import { useEffect, useRef, useState, type ReactNode } from 'react';
import { View, Pressable, AccessibilityInfo } from 'react-native';
import Check from 'lucide-react-native/icons/check';
import { useTranslation } from 'react-i18next';
import { useReducedMotion } from 'react-native-reanimated';
import type {
  WorkoutDetail,
  WorkoutExercise,
  WorkoutSet,
  ActualInput,
} from '@jimo/schemas';
import { emomClock } from '../modes';
import { useWorkoutActions, useWorkoutMutation } from '../queries';
import { prefillDraft, actualPayload, setSummary } from '../helpers';
import { ActualEditor } from '../ActualEditor';
import { workoutHaptic } from '../haptics';
import { WorkoutSurface, InkText } from './Surface';
import { EnsoTimer, TargetPill, InkButton, ExerciseHero } from './components';
import { ink } from './theme';
import { ErrorNotice } from '../../programs/components';

export function PyramidSetTimeline({
  exercise,
  currentId,
  onEdit,
}: {
  exercise: WorkoutExercise;
  currentId: string;
  onEdit(set: WorkoutSet): void;
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
          <Pressable
            key={s.id}
            accessibilityRole="button"
            accessibilityLabel={`${t('set')} ${s.setNumber} · ${t(s.status === 'completed' ? 'completed' : s.id === currentId ? 'current' : 'pending')}`}
            disabled={s.status !== 'completed'}
            onPress={() => onEdit(s)}
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
          </Pressable>
        );
      })}
    </View>
  );
}
function RoundEditor({
  exercise,
  set,
  onSaved,
}: {
  exercise: WorkoutExercise;
  set: WorkoutSet;
  onSaved(w: WorkoutDetail): void;
}) {
  const { t, i18n } = useTranslation('workouts'),
    api = useWorkoutActions(),
    reduced = useReducedMotion();
  const [draft, setDraft] = useState(() =>
    prefillDraft(exercise, set, i18n.resolvedLanguage ?? 'it'),
  );
  const save = useWorkoutMutation(
    (actual: ActualInput) => api.save(set.id, actual),
    (w) => {
      workoutHaptic('set', reduced);
      onSaved(w);
    },
  );
  let actual: ActualInput | null = null;
  try {
    actual = actualPayload(exercise, draft);
  } catch {
    /* inline feedback */
  }
  return (
    <View style={{ width: '100%', gap: 8 }}>
      <TargetPill exercise={exercise} set={set} />
      <ActualEditor exercise={exercise} draft={draft} onChange={setDraft} />
      <InkButton
        primary
        label={t('emom.confirmRound', { round: set.setNumber })}
        disabled={!actual || save.isPending}
        onPress={() => {
          if (actual) save.mutate(actual);
        }}
      />
      {save.error ? <ErrorNotice error={save.error} /> : null}
    </View>
  );
}
export function EmomWorkout({
  workout,
  exercise,
  now,
  header,
  onEdit,
}: {
  workout: WorkoutDetail;
  exercise: WorkoutExercise;
  now: number;
  header: ReactNode;
  onEdit(set: WorkoutSet): void;
}) {
  const { t } = useTranslation('workouts'),
    api = useWorkoutActions(),
    reduced = useReducedMotion();
  const clock = emomClock(exercise, now),
    [selected, setSelected] = useState<string | null>(null);
  const start = useWorkoutMutation(() =>
    api.startEmom(workout.id, exercise.id),
  );
  const cue = useRef<string | null>(null);
  useEffect(() => {
    if (!clock.started || clock.finished || clock.remaining > 5) return;
    const key = `${exercise.id}:${clock.index}`;
    if (cue.current === key) return;
    cue.current = key;
    workoutHaptic('rest', reduced);
    AccessibilityInfo.announceForAccessibility(t('emom.lastSeconds'));
  }, [
    clock.started,
    clock.finished,
    clock.remaining,
    clock.index,
    exercise.id,
    reduced,
    t,
  ]);
  const round =
    exercise.sets.find((s) => s.id === selected) ?? exercise.sets[clock.index]!;
  return (
    <WorkoutSurface variant="emom" centered>
      <View
        testID="emom-live"
        style={{ width: '100%', gap: 12, alignItems: 'center' }}
      >
        {header}
        <ExerciseHero compact name={exercise.exerciseNameSnapshot} />
        <EnsoTimer
          brush
          remaining={clock.remaining}
          total={clock.interval}
          label="EMOM"
        />
        <InkText accessibilityLiveRegion="polite" style={{ fontSize: 24 }}>
          {t('emom.round', {
            current: clock.index + 1,
            total: exercise.sets.length,
          })}
        </InkText>
        {clock.started && !clock.finished && clock.remaining <= 5 ? (
          <InkText style={{ color: ink.sage, fontSize: 20 }}>
            {t('emom.lastSeconds')}
          </InkText>
        ) : null}
        {clock.finished ? (
          <InkText style={{ fontSize: 22 }}>{t('emom.finished')}</InkText>
        ) : null}
        {!clock.started ? (
          <InkButton
            primary
            label={t('emom.start')}
            disabled={start.isPending}
            onPress={() => start.mutate(undefined)}
          />
        ) : round.status === 'pending' ? (
          <RoundEditor
            key={round.id}
            exercise={exercise}
            set={round}
            onSaved={() => setSelected(null)}
          />
        ) : (
          <InkText style={{ color: ink.sage, fontSize: 22 }}>
            {t('emom.saved', { reps: round.actualReps ?? '—' })}
          </InkText>
        )}
        {start.error ? <ErrorNotice error={start.error} /> : null}
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 6,
            width: '100%',
          }}
        >
          {exercise.sets.map((s, i) => (
            <Pressable
              key={s.id}
              accessibilityRole="button"
              accessibilityLabel={`${t('emom.roundLabel')} ${s.setNumber} · ${t(s.status === 'completed' ? 'completed' : i === clock.index ? 'current' : 'pending')}`}
              accessibilityState={{
                selected: s.id === round.id,
                disabled:
                  !clock.started || (!clock.finished && i > clock.index),
              }}
              disabled={!clock.started || (!clock.finished && i > clock.index)}
              onPress={() =>
                s.status === 'completed' ? onEdit(s) : setSelected(s.id)
              }
              style={{
                minWidth: 48,
                minHeight: 48,
                borderRadius: 24,
                borderWidth: i === clock.index ? 2 : 1,
                borderColor: i === clock.index ? ink.sage : ink.border,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: i > clock.index && !clock.finished ? 0.55 : 1,
              }}
            >
              <InkText style={{ fontSize: 20 }}>
                {String(s.setNumber).padStart(2, '0')}
              </InkText>
              {s.status === 'completed' ? (
                <Check size={16} color={ink.sage} />
              ) : null}
            </Pressable>
          ))}
        </View>
        <InkText style={{ fontSize: 17, color: ink.secondary }}>
          {t('emom.completed', {
            count: exercise.sets.filter((s) => s.status === 'completed').length,
          })}
        </InkText>
      </View>
    </WorkoutSurface>
  );
}
