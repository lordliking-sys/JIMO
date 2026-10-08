import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { useOffline } from '../../src/db/Provider';
import { SyncStatus } from '../../src/db/Status';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Button, colors, Screen, spacing, Text } from '@jimo/ui';
import type {
  WorkoutDetail,
  WorkoutExercise,
  WorkoutSet,
  ActualInput,
} from '@jimo/schemas';
import { useApiLocale } from '../../src/api/queries';
import {
  ErrorNotice,
  QueryState,
  useConfirmation,
} from '../../src/programs/components';
import {
  useWorkout,
  useWorkoutMutation,
  useWorkoutActions,
} from '../../src/workouts/queries';
import { ActualEditor } from '../../src/workouts/ActualEditor';
import { SessionSummary, Values } from '../../src/workouts/components';
import {
  actualPayload,
  nextPending,
  prefillDraft,
  recoverRest,
} from '../../src/workouts/helpers';
import { useClock } from '../../src/workouts/useClock';
import { workoutHaptic } from '../../src/workouts/haptics';
import {
  InkText,
  WorkoutSurface,
  useWorkoutLayout,
} from '../../src/workouts/visual/Surface';
import {
  InkActionMenu,
  InkButton,
  WorkoutHeading,
  ExerciseHero,
  SeriesHeading,
  TargetPill,
  SetIndicators,
  EnsoTimer,
  BrushDivider,
  CompletedSet,
  Arrow,
} from '../../src/workouts/visual/components';
import {
  WorkoutVisualPreview,
  type PreviewMode,
} from '../../src/workouts/visual/WorkoutVisualPreview';
import { ink } from '../../src/workouts/visual/theme';
import { SafeBack, useSafeBack } from '../../src/navigation/SafeBack';
function SetEditor({
  exercise,
  set,
  editing,
  onSaved,
  onCancel,
  header,
  onEdit,
}: {
  exercise: WorkoutExercise;
  set: WorkoutSet;
  editing: boolean;
  onSaved: (next: WorkoutDetail) => void;
  onCancel: () => void;
  header: React.ReactNode;
  onEdit: (set: WorkoutSet) => void;
}) {
  const workoutsApi = useWorkoutActions();
  const { t } = useTranslation('workouts'),
    locale = useApiLocale(),
    reducedMotion = useReducedMotion();
  const [draft, setDraft] = useState(() => prefillDraft(exercise, set, locale));
  const save = useWorkoutMutation(
    (body: ActualInput) => workoutsApi.save(set.id, body, editing),
    (next) => {
      workoutHaptic('set', reducedMotion);
      onSaved(next);
    },
  );
  const skip = useWorkoutMutation(() => workoutsApi.skip(set.id), onSaved);
  let actual: ActualInput | null = null;
  try {
    actual = actualPayload(exercise, draft);
  } catch {
    /* feedback stays inline */
  }
  const busy = save.isPending || skip.isPending;
  const submit = () => {
    if (!actual) return;
    save.mutate(actual);
  };
  return (
    <WorkoutSurface
      footer={
        <View style={{ gap: 0 }}>
          {!actual ? (
            <InkText
              accessibilityRole="alert"
              style={{
                fontFamily: 'Inter_400Regular',
                fontSize: 14,
                textAlign: 'center',
              }}
            >
              {t('invalid')}
            </InkText>
          ) : null}
          {save.error ? (
            <Text
              accessibilityRole="alert"
              color={colors.danger}
              variant="caption"
            >
              {t('offline.saveFailed')}
            </Text>
          ) : null}
          <InkButton
            primary
            label={editing ? t('saveCorrection') : t('completeSet')}
            disabled={!actual || busy}
            onPress={submit}
          />
          <InkButton
            label={editing ? t('cancelEdit') : t('skipSet')}
            disabled={busy}
            onPress={() => (editing ? onCancel() : skip.mutate(undefined))}
          >
            <InkText
              style={{
                color: ink.secondary,
                textDecorationLine: 'underline',
                fontSize: 21,
              }}
            >
              {editing ? t('cancelEdit') : t('skipSet')}
            </InkText>
          </InkButton>
        </View>
      }
    >
      {header}
      <ExerciseHero name={exercise.exerciseNameSnapshot} />
      <SeriesHeading current={set.setNumber} total={exercise.sets.length} />
      <TargetPill exercise={exercise} set={set} />
      <ActualEditor exercise={exercise} draft={draft} onChange={setDraft} />
      {save.error ? <ErrorNotice error={save.error} retry={submit} /> : null}
      {skip.error ? (
        <ErrorNotice error={skip.error} retry={() => skip.mutate(undefined)} />
      ) : null}
      {exercise.notes ? (
        <InkText style={{ color: ink.secondary, fontSize: 17 }}>
          {exercise.notes}
        </InkText>
      ) : null}
      <SetIndicators exercise={exercise} currentId={set.id} onEdit={onEdit} />
    </WorkoutSurface>
  );
}

export default function WorkoutScreen() {
  const { id = '' } = useLocalSearchParams<{ id: string }>(),
    query = useWorkout(id),
    workoutsApi = useWorkoutActions(),
    router = useRouter(),
    { t } = useTranslation('workouts');
  useSafeBack('/workout');
  const { usableHeight } = useWorkoutLayout();
  const { runtime } = useOffline();
  const { refetch: queryRefetch } = query;
  const refetch = useCallback(() => {
    void queryRefetch();
  }, [queryRefetch]);
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );
  const now = useClock(refetch),
    reducedMotion = useReducedMotion(),
    confirm = useConfirmation();
  const [editing, setEditing] = useState<{
      exerciseId: string;
      setId: string;
    } | null>(null),
    [transition, setTransition] = useState<string | null>(null);
  const [restPreference, setRestPreference] = useState<{
    key: string;
    value: string | null;
  } | null>(null);
  const [restSaving, setRestSaving] = useState(false),
    [restSaveError, setRestSaveError] = useState(false);
  const [preview, setPreview] = useState<PreviewMode | null>(null);
  const previousRest = useRef<string | null>(null),
    storageKey = `rest-skipped:${runtime.owner}:${id}`;
  const restReady = restPreference?.key === storageKey;
  const skippedRestId = restReady ? restPreference.value : null;
  useEffect(() => {
    if (!runtime.owner) return;
    let live = true;
    void runtime
      .metadata(runtime.identity(), storageKey)
      .then((value) => {
        if (live) setRestPreference({ key: storageKey, value });
      })
      .catch(() => {
        if (live) setRestPreference({ key: storageKey, value: null });
      });
    return () => {
      live = false;
    };
  }, [storageKey, runtime]);
  const finish = useWorkoutMutation((skipPending: boolean) =>
      workoutsApi.finish(id, skipPending),
    ),
    cancel = useWorkoutMutation(() => workoutsApi.cancel(id));
  const workout = query.data,
    next = workout ? nextPending(workout) : null,
    rest =
      workout && restReady ? recoverRest(workout, now, skippedRestId) : null;
  useEffect(() => {
    if (rest) {
      previousRest.current = rest.set.id;
    } else if (previousRest.current && restReady) {
      previousRest.current = null;
      workoutHaptic('rest', reducedMotion);
      AccessibilityInfo.announceForAccessibility(t('nextSet'));
    }
  }, [rest, restReady, reducedMotion, t]);
  if (query.isPending || query.error || !workout)
    return (
      <QueryState
        pending={query.isPending}
        error={query.error}
        retry={refetch}
      />
    );
  const busy = finish.isPending || cancel.isPending || restSaving;
  const finishAction = () =>
    workout.pendingSets > 0
      ? confirm.ask(t('finishConfirm'), () => finish.mutate(true))
      : finish.mutate(false);
  const actions = [
    { label: t('finishEarly'), action: finishAction },
    {
      label: t('cancel'),
      action: () =>
        confirm.ask(t('cancelConfirm'), () => cancel.mutate(undefined)),
    },
    { label: t('visual.emomPreview'), action: () => setPreview('emom') },
    { label: t('visual.pyramidPreview'), action: () => setPreview('pyramid') },
  ];
  const counter = `${(editing ? workout.exercises.findIndex((e) => e.id === editing.exerciseId) : (next?.exerciseIndex ?? 0)) + 1} / ${workout.exercises.length}`;
  const header = (
    <>
      {workout.status === 'in_progress' ? (
        <WorkoutHeading
          title={rest && !editing ? t('rest') : workout.name}
          divider={!rest || Boolean(editing)}
          trailing={
            rest && !editing ? (
              <View style={{ width: 48 }} />
            ) : (
              <InkActionMenu
                label={t('sessionActions')}
                title={workout.name}
                disabled={busy || !restReady}
                actions={actions}
              >
                <InkText style={{ fontSize: 22 }}>{counter}</InkText>
              </InkActionMenu>
            )
          }
        />
      ) : (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
          }}
        >
          <SafeBack />
          <Text variant="h3">{workout.name}</Text>
        </View>
      )}
      <SyncStatus />
      {confirm.dialog}
      <WorkoutVisualPreview mode={preview} onClose={() => setPreview(null)} />
    </>
  );
  const errors = (
    <>
      {finish.error ? (
        <ErrorNotice error={finish.error} retry={finishAction} />
      ) : null}
      {cancel.error ? <ErrorNotice error={cancel.error} /> : null}
    </>
  );
  if (workout.status !== 'in_progress')
    return (
      <Screen contentStyle={{ padding: spacing.lg, gap: spacing.lg }}>
        {header}
        {workout.status === 'completed' ? (
          <Text variant="h2">{t('workoutStatus.completed')}</Text>
        ) : null}
        <SessionSummary workout={workout} />
        <Button label={t('back')} onPress={() => router.replace('/workout')} />
      </Screen>
    );
  const selectedExercise = editing
    ? workout.exercises.find((e) => e.id === editing.exerciseId)
    : next?.exercise;
  const selectedSet = editing
    ? selectedExercise?.sets.find((s) => s.id === editing.setId)
    : next?.set;
  if (editing && selectedExercise && selectedSet)
    return (
      <SetEditor
        key={`edit-${selectedSet.id}`}
        exercise={selectedExercise}
        set={selectedSet}
        editing
        header={header}
        onEdit={(s) =>
          setEditing({ exerciseId: selectedExercise.id, setId: s.id })
        }
        onCancel={() => setEditing(null)}
        onSaved={() => setEditing(null)}
      />
    );
  if (!restReady)
    return (
      <Screen>
        {header}
        <Text>{t('loading')}</Text>
      </Screen>
    );
  if (rest && next)
    return (
      <WorkoutSurface
        centered
        variant="rest"
        key={`rest-${rest.set.id}`}
        footer={
          <InkButton
            label={t('skipRest')}
            disabled={restSaving}
            onPress={() => {
              setRestSaving(true);
              setRestSaveError(false);
              void runtime
                .metadata(runtime.identity(), storageKey, rest.set.id)
                .then(() => {
                  previousRest.current = null;
                  setRestPreference({ key: storageKey, value: rest.set.id });
                })
                .catch(() => setRestSaveError(true))
                .finally(() => setRestSaving(false));
            }}
          >
            <View
              style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}
            >
              <InkText
                style={{
                  letterSpacing: 1.4,
                  fontSize: 21,
                  textTransform: 'uppercase',
                }}
              >
                {t('visual.skip')}
              </InkText>
              <Arrow />
            </View>
          </InkButton>
        }
      >
        {header}
        {errors}
        {restSaveError ? (
          <Text color={colors.danger} accessibilityRole="alert">
            {t('offline.saveFailed')}
          </Text>
        ) : null}
        <View
          style={{
            flex: 1,
            minHeight: 0,
            maxHeight: usableHeight > 800 ? 80 : 24,
          }}
        />
        <EnsoTimer
          remaining={rest.remaining}
          total={rest.exercise.restSecondsSnapshot ?? 0}
          label={t('rest')}
        />
        <BrushDivider />
        <InkText
          accessibilityRole="header"
          style={{
            textAlign: 'center',
            fontSize: 34,
            letterSpacing: 1.2,
            textTransform: 'uppercase',
          }}
        >
          {next.exercise.exerciseNameSnapshot}
        </InkText>
        <InkText style={{ textAlign: 'center', fontSize: 23 }}>
          {t('visual.nextSeries', {
            current: next.set.setNumber,
            total: next.exercise.sets.length,
          })}
        </InkText>
        <View style={{ width: '100%', marginTop: 4 }}>
          <TargetPill exercise={next.exercise} set={next.set} />
        </View>
        <View style={{ width: '100%', gap: 4, marginTop: 4 }}>
          <InkText style={{ fontSize: 19, color: ink.secondary }}>
            {t('visual.lastCompleted')}
          </InkText>
          <CompletedSet
            exercise={rest.exercise}
            set={rest.set}
            onEdit={() =>
              setEditing({ exerciseId: rest.exercise.id, setId: rest.set.id })
            }
          />
          {rest.exercise.sets
            .filter((s) => s.status === 'completed' && s.id !== rest.set.id)
            .map((s) => (
              <CompletedSet
                key={s.id}
                exercise={rest.exercise}
                set={s}
                onEdit={() =>
                  setEditing({ exerciseId: rest.exercise.id, setId: s.id })
                }
              />
            ))}
        </View>
      </WorkoutSurface>
    );
  if (transition && next)
    return (
      <Screen
        contentStyle={{ padding: spacing.lg, gap: spacing.xl }}
        footer={
          <Button label={t('continue')} onPress={() => setTransition(null)} />
        }
      >
        {header}
        {errors}
        <Text variant="h2">{t('exerciseDone')}</Text>
        <Text variant="label" color={colors.secondary}>
          {t('nextExercise')}
        </Text>
        <Text variant="h1">{transition}</Text>
        <Values exercise={next.exercise} set={next.set} />
      </Screen>
    );
  if (!next)
    return (
      <Screen
        contentStyle={{ padding: spacing.lg, gap: spacing.lg }}
        footer={
          <Button label={t('finish')} disabled={busy} onPress={finishAction} />
        }
      >
        {header}
        {errors}
        <Text variant="h2">{t('readyFinish')}</Text>
        <SessionSummary
          workout={workout}
          onEdit={(exercise, s) =>
            setEditing({ exerciseId: exercise.id, setId: s.id })
          }
        />
      </Screen>
    );
  return (
    <View style={{ flex: 1 }}>
      <SetEditor
        key={next.set.id}
        exercise={next.exercise}
        set={next.set}
        editing={false}
        onEdit={(s) =>
          setEditing({ exerciseId: next.exercise.id, setId: s.id })
        }
        header={
          <>
            {header}
            {errors}
          </>
        }
        onCancel={() => {}}
        onSaved={(updated) => {
          const following = nextPending(updated);
          if (following && following.exercise.id !== next.exercise.id)
            setTransition(following.exercise.exerciseNameSnapshot);
        }}
      />
    </View>
  );
}
