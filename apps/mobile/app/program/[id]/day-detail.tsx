import { useState } from 'react';
import { ExerciseActions } from '../../../src/programs/ExerciseActions';
import { DayEditor } from '../../../src/programs/DayEditor';
import { ProgramOverlay } from '../../../src/programs/ProgramOverlay';
import type { ProgramExerciseDto } from '@jimo/schemas';
import { ExerciseThumbnail } from '../../../src/programs/ExerciseThumbnail';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text } from '@jimo/ui';
import EllipsisVertical from 'lucide-react-native/icons/ellipsis-vertical';
import {
  useProgram,
  useExercise,
  useProgramMutation,
  useApiLocale,
} from '../../../src/api/queries';
import { programsApi } from '../../../src/api/programs';
import { ApiClientError } from '../../../src/api/client';
import {
  FormHeader,
  ActionMenu,
  QueryState,
  ErrorNotice,
  useConfirmation,
} from '../../../src/programs/components';
import {
  ProgramScreen,
  ProgramText,
  ProgramRow,
  ProgramButton,
  programInk,
} from '../../../src/programs/presentation';
import { moved } from '../../../src/programs/helpers';
import { exerciseSummary } from '../../../src/programs/summary';
import { StartWorkout } from '../../../src/workouts/components';
export default function DayDetail() {
  const { id, dayId, overlay, exerciseId, prescriptionId, backTo } =
      useLocalSearchParams<{
        id: string;
        dayId: string;
        overlay?: string;
        exerciseId?: string;
        prescriptionId?: string;
        backTo?: string;
      }>(),
    query = useProgram(id),
    locale = useApiLocale(),
    { t } = useTranslation('programs'),
    confirmation = useConfirmation();
  const [userAction, setAction] = useState<
      ProgramExerciseDto | 'new' | 'custom' | null
    >(null),
    [editDay, setEditDay] = useState(false);
  const mutation = useProgramMutation(
    (action: () => ReturnType<typeof programsApi.detail>) => action(),
  );
  const run = (action: () => ReturnType<typeof programsApi.detail>) => {
    if (!mutation.isPending) mutation.mutate(action);
  };
  const day = query.data?.days.find((d) => d.id === dayId);
  const selected = useExercise(exerciseId ?? '');
  const [handled, setHandled] = useState<string | null>(null);
  const key = `${id}:${dayId}:${overlay}:${exerciseId}:${prescriptionId}`;
  const requested = !!day && !!overlay && handled !== key;
  const legacyAction =
    requested && overlay !== 'day'
      ? prescriptionId
        ? (day.exercises.find((e) => e.id === prescriptionId) ?? null)
        : overlay === 'editor' && !selected.data
          ? null
          : overlay === 'custom'
            ? 'custom'
            : 'new'
      : null;
  const action = userAction ?? legacyAction;
  const closeAction = () => {
    setAction(null);
    setHandled(key);
  };
  const editingDay = editDay || (requested && overlay === 'day');
  const closeDay = () => {
    setEditDay(false);
    setHandled(key);
  };
  if (!query.data || !day)
    return (
      <QueryState
        presentation
        pending={query.isPending}
        error={query.error ?? new ApiClientError('NOT_FOUND', 404)}
        retry={() => void query.refetch()}
      />
    );
  return (
    <ProgramScreen
      header={
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <FormHeader
              fontSize={22}
              title={query.data.name}
              subtitle={
                day.dayOfWeek
                  ? t(`weekdays.${day.dayOfWeek as 1 | 2 | 3 | 4 | 5 | 6 | 7}`)
                  : day.name
              }
            />
          </View>
          <ActionMenu
            icon={<EllipsisVertical size={22} color={programInk.paper} />}
            label={t('dayActions', { name: day.name })}
            title={day.name}
            actions={[
              { label: t('editDay'), action: () => setEditDay(true) },
              { label: t('createCustom'), action: () => setAction('custom') },
            ]}
          />
        </View>
      }
      background="day"
      fallback={
        backTo === 'scheda'
          ? '/program'
          : { pathname: '/program/[id]', params: { id } }
      }
      footer={
        <ProgramButton
          label={t('addExercise')}
          disabled={mutation.isPending}
          onPress={() => setAction('new')}
        />
      }
    >
      <ProgramText accessibilityRole="header">{day.name}</ProgramText>
      {editingDay ? (
        <ProgramOverlay back={closeDay}>
          <DayEditor id={id} day={day} onSaved={closeDay} />
        </ProgramOverlay>
      ) : null}
      {action ? (
        <ExerciseActions
          dayId={day.id}
          {...(action === 'new' || action === 'custom'
            ? {}
            : { initial: action })}
          {...(userAction === null &&
          action === 'new' &&
          overlay === 'editor' &&
          selected.data
            ? { selected: selected.data }
            : {})}
          custom={action === 'custom'}
          close={closeAction}
        />
      ) : null}
      {day.notes ? (
        <Text variant="caption" color={programInk.text}>
          {day.notes}
        </Text>
      ) : null}
      <Text variant="caption" color={programInk.text}>
        {t('exerciseCount', { count: day.exercises.length })}
      </Text>
      {mutation.error ? <ErrorNotice error={mutation.error} /> : null}
      <View style={{ gap: 10 }}>
        {day.exercises.map((exercise, index) => {
          const summary = exerciseSummary(exercise, locale, t);
          return (
            <ProgramRow
              key={exercise.id}
              title={exercise.exercise.displayName}
              cardTone="light"
              leading={
                <ExerciseThumbnail exercise={exercise.exercise} tone="light" />
              }
              label={`${t('editExercise')} ${exercise.exercise.displayName}`}
              subtitle={`${summary.primary}${summary.details ? `\n${summary.details}` : ''}${exercise.notes ? `\n${exercise.notes}` : ''}`}
              onPress={() => setAction(exercise)}
              trailing={
                <ActionMenu
                  label={t('exerciseActions', {
                    name: exercise.exercise.displayName,
                  })}
                  title={exercise.exercise.displayName}
                  disabled={mutation.isPending}
                  actions={[
                    {
                      label: `${t('moveUp')} ${exercise.exercise.displayName}`,
                      disabled: index === 0,
                      action: () =>
                        run(() =>
                          programsApi.reorderExercises(
                            day.id,
                            moved(day.exercises, index, -1).map((e) => e.id),
                            locale,
                          ),
                        ),
                    },
                    {
                      label: `${t('moveDown')} ${exercise.exercise.displayName}`,
                      disabled: index === day.exercises.length - 1,
                      action: () =>
                        run(() =>
                          programsApi.reorderExercises(
                            day.id,
                            moved(day.exercises, index, 1).map((e) => e.id),
                            locale,
                          ),
                        ),
                    },
                    {
                      label: `${t('removeExercise')} ${exercise.exercise.displayName}`,
                      action: () =>
                        confirmation.ask(t('confirmRemoveExercise'), () =>
                          run(() =>
                            programsApi.removeExercise(exercise.id, locale),
                          ),
                        ),
                    },
                  ]}
                />
              }
            />
          );
        })}
      </View>
      {!day.exercises.length ? (
        <Text color={programInk.secondary}>{t('noDayExercises')}</Text>
      ) : null}
      {query.data.status === 'active' ? (
        <View>
          <StartWorkout
            buttonComponent={ProgramButton}
            dayId={day.id}
            secondary
            disabled={!day.exercises.length}
          />
        </View>
      ) : null}
      {confirmation.dialog}
    </ProgramScreen>
  );
}
