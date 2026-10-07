import { NewRecords } from '../progress/NewRecords';
import { formatTrainingDuration } from '../progress/helpers';
import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button, colors, spacing, Text } from '@jimo/ui';
import type { WorkoutDetail, WorkoutExercise, WorkoutSet } from '@jimo/schemas';
import { useApiLocale } from '../api/queries';
import { ApiClientError } from '../api/client';
import { LocalWorkoutConflict } from '../db/repositories/workouts';
import { ErrorNotice } from '../programs/components';
import { useWorkoutMutation, useWorkoutActions } from './queries';
import { actualDiffers, sessionSeconds, setSummary } from './helpers';
export function StartWorkout({
  dayId,
  disabled = false,
}: {
  dayId: string;
  disabled?: boolean;
}) {
  const { t } = useTranslation('workouts'),
    workoutsApi = useWorkoutActions(),
    router = useRouter();
  const mutation = useWorkoutMutation(
    (id: string) => workoutsApi.start(id),
    (w) => router.push({ pathname: '/workout/[id]', params: { id: w.id } }),
  );
  const conflict =
    mutation.error instanceof LocalWorkoutConflict ||
    (mutation.error instanceof ApiClientError &&
      mutation.error.code === 'ACTIVE_WORKOUT_EXISTS');
  return (
    <View style={{ gap: spacing.sm }}>
      <Button
        label={conflict ? t('resume') : t('start')}
        disabled={disabled || mutation.isPending}
        onPress={() => {
          if (
            conflict &&
            (mutation.error instanceof ApiClientError ||
              mutation.error instanceof LocalWorkoutConflict) &&
            mutation.error.sessionId
          ) {
            router.push({
              pathname: '/workout/[id]',
              params: { id: mutation.error.sessionId },
            });
            return;
          }
          mutation.mutate(dayId);
        }}
      />
      {conflict ? (
        <Text accessibilityRole="alert" variant="caption">
          {t('startConflict')}
        </Text>
      ) : mutation.error ? (
        <ErrorNotice error={mutation.error} />
      ) : null}
    </View>
  );
}
export function Values({
  exercise,
  set,
  actual = false,
}: {
  exercise: WorkoutExercise;
  set: WorkoutSet;
  actual?: boolean;
}) {
  const { t } = useTranslation('workouts'),
    locale = useApiLocale(),
    s = setSummary(exercise, set, locale, actual);
  const mode = exercise.loadModeSnapshot;
  return (
    <Text
      variant="bodyMedium"
      color={actual ? colors.text : colors.primarySoft}
    >
      {`${s.target}${exercise.trackingModeSnapshot === 'reps' ? ` ${t('reps').toLowerCase()}` : ''} · ${mode === 'bodyweight' ? t('bodyweight') : mode === 'assisted' ? `${t('assisted')} ${s.load || '—'} kg` : `${mode === 'weighted' ? '+' : ''}${s.load || '—'} kg`}${s.rpe ? ` · RPE ${s.rpe}` : ''}`}
    </Text>
  );
}
export function SetRows({
  exercise,
  currentId,
  onEdit,
}: {
  exercise: WorkoutExercise;
  currentId?: string;
  onEdit?: (set: WorkoutSet) => void;
}) {
  const { t } = useTranslation('workouts');
  return (
    <View style={{ gap: spacing.xs }}>
      <Text variant="caption" color={colors.secondary}>
        {t('setTable')}
      </Text>
      {exercise.sets.map((set) => {
        const row = (
          <View
            style={{
              minHeight: 48,
              paddingVertical: spacing.sm,
              borderTopWidth: 1,
              borderColor: colors.border,
              flexDirection: 'row',
              gap: spacing.md,
              alignItems: 'center',
            }}
          >
            <Text
              variant="bodyMedium"
              color={set.id === currentId ? colors.primarySoft : colors.text}
            >
              {set.setNumber}
            </Text>
            <View style={{ flex: 1, gap: spacing.xs }}>
              <Values
                exercise={exercise}
                set={set}
                actual={set.status === 'completed'}
              />
              <Text variant="caption" color={colors.secondary}>
                {set.id === currentId ? t('current') : t(set.status)}
              </Text>
              {set.status === 'completed' && actualDiffers(set) ? (
                <>
                  <Text variant="caption" color={colors.secondary}>
                    {t('target')}
                  </Text>
                  <Values exercise={exercise} set={set} />
                </>
              ) : null}
            </View>
            <Text
              color={
                set.status === 'completed'
                  ? colors.primarySoft
                  : colors.secondary
              }
            >
              {set.status === 'completed'
                ? '✓'
                : set.status === 'skipped'
                  ? '—'
                  : '○'}
            </Text>
          </View>
        );
        return onEdit && set.status === 'completed' ? (
          <Pressable
            key={set.id}
            accessibilityRole="button"
            accessibilityLabel={t('editSet', { number: set.setNumber })}
            onPress={() => onEdit(set)}
          >
            {row}
          </Pressable>
        ) : (
          <View key={set.id}>{row}</View>
        );
      })}
    </View>
  );
}
export function SessionSummary({
  workout,
  onEdit,
}: {
  workout: WorkoutDetail;
  onEdit?: (exercise: WorkoutExercise, set: WorkoutSet) => void;
}) {
  const { t, i18n } = useTranslation('workouts');
  return (
    <View style={{ gap: spacing.lg }}>
      <Text variant="h1">{workout.name}</Text>
      <Text color={colors.secondary}>
        {new Date(workout.startedAt).toLocaleDateString(
          i18n.resolvedLanguage === 'it' ? 'it-IT' : 'en-US',
          { day: 'numeric', month: 'long', year: 'numeric' },
        )}{' '}
        · {t(`workoutStatus.${workout.status}`)}
      </Text>
      <Text>
        {t('elapsed')}:{' '}
        {formatTrainingDuration(sessionSeconds(workout), i18n.language)}
      </Text>
      <Text>
        {t('completedSets')}: {workout.completedSets} · {t('skippedSets')}:{' '}
        {workout.skippedSets}
      </Text>
      {workout.status === 'completed' ? (
        <NewRecords sessionId={workout.id} />
      ) : null}
      {workout.exercises.map((exercise) => (
        <View key={exercise.id} style={{ gap: spacing.sm }}>
          <Text variant="h3">{exercise.exerciseNameSnapshot}</Text>
          <SetRows
            exercise={exercise}
            {...(onEdit
              ? { onEdit: (set: WorkoutSet) => onEdit(exercise, set) }
              : {})}
          />
        </View>
      ))}
    </View>
  );
}
