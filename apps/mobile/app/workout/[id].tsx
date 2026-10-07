import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, View, useWindowDimensions } from 'react-native';
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
  ActionMenu,
  Back,
  ErrorNotice,
  FormScreen,
  QueryState,
  useConfirmation,
} from '../../src/programs/components';
import {
  useWorkout,
  useWorkoutMutation,
  useWorkoutActions,
} from '../../src/workouts/queries';
import { ActualEditor } from '../../src/workouts/ActualEditor';
import { SessionSummary, SetRows, Values } from '../../src/workouts/components';
import {
  actualPayload,
  countdown,
  nextPending,
  prefillDraft,
  recoverRest,
} from '../../src/workouts/helpers';
import { useClock } from '../../src/workouts/useClock';
import { workoutHaptic } from '../../src/workouts/haptics';
function SetEditor({
  workout,
  exercise,
  set,
  editing,
  onSaved,
  onCancel,
  header,
  onEdit,
}: {
  workout: WorkoutDetail;
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
  const exerciseIndex = workout.exercises.findIndex(
    (e) => e.id === exercise.id,
  );
  return (
    <FormScreen
      invalid={!actual}
      footer={
        <View style={{ gap: spacing.sm }}>
          {save.error ? (
            <Text
              accessibilityRole="alert"
              color={colors.danger}
              variant="caption"
            >
              {t('offline.saveFailed')}
            </Text>
          ) : null}
          <Button
            label={editing ? t('saveCorrection') : t('completeSet')}
            disabled={!actual || busy}
            onPress={submit}
          />
          <Button
            variant="secondary"
            label={editing ? t('cancelEdit') : t('skipSet')}
            disabled={busy}
            onPress={() => (editing ? onCancel() : skip.mutate(undefined))}
          />
        </View>
      }
    >
      {header}
      <Text variant="caption" color={colors.secondary}>
        {t('exerciseProgress', {
          current: exerciseIndex + 1,
          total: workout.exercises.length,
        })}
      </Text>
      <Text variant="h1">{exercise.exerciseNameSnapshot}</Text>
      <Text variant="h3" color={colors.primarySoft}>
        {t('setProgress', {
          current: set.setNumber,
          total: exercise.sets.length,
        })}
      </Text>
      <View
        accessibilityLabel={t('target')}
        style={{
          gap: spacing.sm,
          paddingVertical: spacing.md,
          borderBottomWidth: 1,
          borderColor: colors.border,
        }}
      >
        <Text variant="label" color={colors.secondary}>
          {t('target')}
        </Text>
        <Values exercise={exercise} set={set} />
        {set.targetRpe ? (
          <Text variant="caption" color={colors.secondary}>
            {t('targetRpe', {
              value:
                locale === 'it'
                  ? set.targetRpe.replace('.', ',')
                  : set.targetRpe,
            })}
          </Text>
        ) : null}
        {set.targetRepMin !== null ? (
          <Text variant="caption" color={colors.secondary}>
            {t('rangeHint')}
          </Text>
        ) : null}
      </View>
      <ActualEditor exercise={exercise} draft={draft} onChange={setDraft} />
      {save.error ? <ErrorNotice error={save.error} retry={submit} /> : null}
      {skip.error ? (
        <ErrorNotice error={skip.error} retry={() => skip.mutate(undefined)} />
      ) : null}
      {exercise.notes ? (
        <Text variant="caption" color={colors.secondary}>
          {exercise.notes}
        </Text>
      ) : null}
      <SetRows exercise={exercise} currentId={set.id} onEdit={onEdit} />
    </FormScreen>
  );
}
export default function WorkoutScreen() {
  const { id = '' } = useLocalSearchParams<{ id: string }>(),
    query = useWorkout(id),
    workoutsApi = useWorkoutActions(),
    router = useRouter(),
    { t } = useTranslation('workouts');
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
  const { width, fontScale } = useWindowDimensions();
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
  const restFontSize = Math.min(
    64,
    (width - spacing.lg * 2) /
      (countdown(rest?.remaining ?? 0).length * 0.72 * fontScale),
  );
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
  const header = (
    <>
      <SyncStatus />
      <View
        style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
      >
        <Back compact />
        <Text variant="h3" style={{ flex: 1 }}>
          {workout.name}
        </Text>
        {workout.status === 'in_progress' ? (
          <ActionMenu
            label={t('sessionActions')}
            title={workout.name}
            disabled={busy || !restReady}
            actions={[
              { label: t('finishEarly'), action: finishAction },
              {
                label: t('cancel'),
                action: () =>
                  confirm.ask(t('cancelConfirm'), () =>
                    cancel.mutate(undefined),
                  ),
              },
            ]}
          />
        ) : null}
        {confirm.dialog}
      </View>
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
        workout={workout}
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
      <Screen
        key={`rest-${rest.set.id}`}
        contentStyle={{ padding: spacing.lg, gap: spacing.xl }}
        footer={
          <Button
            label={t('skipRest')}
            busy={restSaving}
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
          />
        }
      >
        {header}
        {errors}
        {restSaveError ? (
          <Text color={colors.danger} accessibilityRole="alert">
            {t('offline.saveFailed')}
          </Text>
        ) : null}
        <Text variant="label" color={colors.primarySoft}>
          {t('rest')}
        </Text>
        <Text
          variant="h1"
          style={{
            fontSize: restFontSize,
            lineHeight: restFontSize * 1.25,
            textAlign: 'center',
            paddingVertical: spacing.xxl,
          }}
          accessibilityLabel={`${t('rest')} ${countdown(rest.remaining)}`}
          accessibilityLiveRegion="none"
        >
          {countdown(rest.remaining)}
        </Text>
        <Text variant="h3">{t('nextSet')}</Text>
        <Text>
          {next.exercise.exerciseNameSnapshot} ·{' '}
          {t('setProgress', {
            current: next.set.setNumber,
            total: next.exercise.sets.length,
          })}
        </Text>
        <Values exercise={next.exercise} set={next.set} />
        <SetRows
          exercise={rest.exercise}
          onEdit={(s) =>
            setEditing({ exerciseId: rest.exercise.id, setId: s.id })
          }
        />
      </Screen>
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
        workout={workout}
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
