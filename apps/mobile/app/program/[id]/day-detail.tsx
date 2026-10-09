import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text } from '@jimo/ui';
import EllipsisVertical from 'lucide-react-native/icons/ellipsis-vertical';
import {
  useProgram,
  useProgramMutation,
  useApiLocale,
} from '../../../src/api/queries';
import { programsApi } from '../../../src/api/programs';
import { ApiClientError } from '../../../src/api/client';
import {
  Back,
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
import { HeroReadabilityWash } from '../../../src/components/HeroReadabilityWash';
import { StartWorkout } from '../../../src/workouts/components';
export default function DayDetail() {
  const { id, dayId } = useLocalSearchParams<{ id: string; dayId: string }>(),
    query = useProgram(id),
    router = useRouter(),
    locale = useApiLocale(),
    { t } = useTranslation('programs'),
    confirmation = useConfirmation();
  const mutation = useProgramMutation(
    (action: () => ReturnType<typeof programsApi.detail>) => action(),
  );
  const run = (action: () => ReturnType<typeof programsApi.detail>) => {
    if (!mutation.isPending) mutation.mutate(action);
  };
  const day = query.data?.days.find((d) => d.id === dayId);
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
      background="day"
      fallback={{ pathname: '/program/[id]', params: { id } }}
      footer={
        <ProgramButton
          label={t('addExercise')}
          disabled={mutation.isPending}
          onPress={() =>
            router.push({
              pathname: '/program/[id]/choose-exercise',
              params: { id, dayId },
            })
          }
        />
      }
    >
      <View style={{ position: 'relative', paddingBottom: 22, minHeight: 155 }}>
        <HeroReadabilityWash variant="dark" />
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Back compact color={programInk.paper} />
          <ActionMenu
            icon={<EllipsisVertical size={22} color={programInk.paper} />}
            label={t('dayActions', { name: day.name })}
            title={day.name}
            actions={[
              {
                label: t('editDay'),
                action: () =>
                  router.push({
                    pathname: '/program/[id]/day',
                    params: { id, dayId },
                  }),
              },
            ]}
          />
        </View>
        <ProgramText
          accessibilityRole="header"
          style={{ color: programInk.paper, fontSize: 32, lineHeight: 34 }}
        >
          {t('dayNumber', { count: query.data.days.indexOf(day) + 1 })}
          {'\n'}
          {day.name}
        </ProgramText>
        {day.dayOfWeek ? (
          <Text
            variant="caption"
            color={programInk.paper}
            style={{ marginTop: 8 }}
          >
            {t(`weekdays.${day.dayOfWeek as 1 | 2 | 3 | 4 | 5 | 6 | 7}`)}
          </Text>
        ) : null}
      </View>
      {day.notes ? (
        <Text variant="caption" color={programInk.charcoal}>
          {day.notes}
        </Text>
      ) : null}
      <Text variant="caption" color={programInk.charcoal}>
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
              label={`${t('editExercise')} ${exercise.exercise.displayName}`}
              subtitle={`${summary.primary}${summary.details ? `\n${summary.details}` : ''}${exercise.notes ? `\n${exercise.notes}` : ''}`}
              onPress={() =>
                router.push({
                  pathname: '/program/[id]/exercise',
                  params: {
                    id,
                    dayId,
                    exerciseId: exercise.exerciseId,
                    prescriptionId: exercise.id,
                  },
                })
              }
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
        <View style={{ backgroundColor: programInk.green, borderRadius: 8 }}>
          <StartWorkout
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
