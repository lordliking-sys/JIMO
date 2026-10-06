import { useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';
import ArrowUp from 'lucide-react-native/icons/arrow-up';
import ArrowDown from 'lucide-react-native/icons/arrow-down';
import Pencil from 'lucide-react-native/icons/pencil';
import Trash2 from 'lucide-react-native/icons/trash';
import { useTranslation } from 'react-i18next';
import { Screen, Text, Button, Card, IconButton, colors } from '@jimo/ui';
import {
  useProgram,
  useProgramMutation,
  useApiLocale,
} from '../../../src/api/queries';
import { programsApi } from '../../../src/api/programs';
import {
  Back,
  QueryState,
  ErrorNotice,
  useConfirmation,
  styles,
} from '../../../src/programs/components';
import {
  moved,
  restDisplay,
  decimalDisplay,
  statusKey,
} from '../../../src/programs/helpers';
export default function Builder() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    router = useRouter(),
    { t } = useTranslation('programs'),
    locale = useApiLocale(),
    query = useProgram(id),
    confirmation = useConfirmation();
  const mutation = useProgramMutation(
    (action: () => ReturnType<typeof programsApi.detail>) => action(),
  );
  const run = (action: () => ReturnType<typeof programsApi.detail>) => {
    if (!mutation.isPending) mutation.mutate(action);
  };
  if (!query.data)
    return (
      <QueryState
        pending={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
      />
    );
  const program = query.data;
  return (
    <Screen>
      <Back />
      <Text variant="h1">{program.name}</Text>
      <Text
        variant="label"
        color={program.status === 'active' ? colors.primary : colors.secondary}
      >
        {t(statusKey(program.status))}
      </Text>
      {program.description ? <Text>{program.description}</Text> : null}
      {program.durationWeeks ? (
        <Text>{t('weekCount', { count: program.durationWeeks })}</Text>
      ) : null}
      {program.startsOn ? <Text>{program.startsOn}</Text> : null}
      <Button
        label={t('editProgram')}
        variant="secondary"
        disabled={mutation.isPending}
        onPress={() =>
          router.push({ pathname: '/program/[id]/settings', params: { id } })
        }
      />
      {mutation.error ? <ErrorNotice error={mutation.error} /> : null}
      {program.days.map((day, dayIndex) => (
        <Card key={day.id}>
          <Text variant="label">{t('dayNumber', { count: dayIndex + 1 })}</Text>
          <Text variant="h2">{day.name}</Text>
          {day.dayOfWeek ? (
            <Text>
              {t(`weekdays.${day.dayOfWeek as 1 | 2 | 3 | 4 | 5 | 6 | 7}`)}
            </Text>
          ) : null}
          {day.notes ? <Text>{day.notes}</Text> : null}
          <View style={styles.row}>
            <IconButton
              icon={<Pencil color={colors.secondary} size={20} />}
              label={t('editDay')}
              disabled={mutation.isPending}
              onPress={() =>
                router.push({
                  pathname: '/program/[id]/day',
                  params: { id, dayId: day.id },
                })
              }
            />
            <IconButton
              icon={<ArrowUp color={colors.secondary} size={20} />}
              label={`${t('moveUp')} ${day.name}`}
              disabled={mutation.isPending || dayIndex === 0}
              onPress={() =>
                run(() =>
                  programsApi.reorderDays(
                    id,
                    moved(program.days, dayIndex, -1).map((d) => d.id),
                    locale,
                  ),
                )
              }
            />
            <IconButton
              icon={<ArrowDown color={colors.secondary} size={20} />}
              label={`${t('moveDown')} ${day.name}`}
              disabled={
                mutation.isPending || dayIndex === program.days.length - 1
              }
              onPress={() =>
                run(() =>
                  programsApi.reorderDays(
                    id,
                    moved(program.days, dayIndex, 1).map((d) => d.id),
                    locale,
                  ),
                )
              }
            />
            <IconButton
              icon={<Trash2 color={colors.secondary} size={20} />}
              label={t('deleteDay')}
              disabled={mutation.isPending}
              onPress={() =>
                day.exercises.length
                  ? confirmation.ask(t('confirmDeleteDay'), () =>
                      run(() => programsApi.removeDay(day.id, locale)),
                    )
                  : run(() => programsApi.removeDay(day.id, locale))
              }
            />
          </View>
          {day.exercises.map((e, index) => (
            <Card key={e.id}>
              <Text variant="h3">{e.exercise.displayName}</Text>
              <Text>
                {e.targetDurationSeconds != null
                  ? t('timedSummary', {
                      sets: e.targetSets,
                      seconds: e.targetDurationSeconds,
                    })
                  : e.targetRepMin != null
                    ? t('rangeSummary', {
                        sets: e.targetSets,
                        min: e.targetRepMin,
                        max: e.targetRepMax,
                      })
                    : t('fixedSummary', {
                        sets: e.targetSets,
                        reps: e.targetReps,
                      })}
              </Text>
              <Text>
                {t(`loadModes.${e.loadMode}`)}
                {e.targetLoadKg != null
                  ? ` · ${e.loadMode === 'weighted' ? '+' : ''}${decimalDisplay(e.targetLoadKg, locale)} ${t('kgUnit')}`
                  : e.targetAssistanceKg != null
                    ? ` · ${decimalDisplay(e.targetAssistanceKg, locale)} ${t('kgUnit')}`
                    : ''}
              </Text>
              {e.restSeconds != null ? (
                <Text>
                  {t('restSummary', {
                    value: `${restDisplay(e.restSeconds)}${e.restSeconds < 60 ? t('secondsSuffix') : ''}`,
                  })}
                </Text>
              ) : null}
              {e.targetRpe ? (
                <Text>
                  {t('rpeSummary', {
                    value: decimalDisplay(e.targetRpe, locale),
                  })}
                </Text>
              ) : null}
              {e.notes ? <Text>{e.notes}</Text> : null}
              <View style={styles.row}>
                <IconButton
                  icon={<Pencil color={colors.secondary} size={20} />}
                  label={`${t('editExercise')} ${e.exercise.displayName}`}
                  disabled={mutation.isPending}
                  onPress={() =>
                    router.push({
                      pathname: '/program/[id]/exercise',
                      params: {
                        id,
                        dayId: day.id,
                        exerciseId: e.exerciseId,
                        prescriptionId: e.id,
                      },
                    })
                  }
                />
                <IconButton
                  icon={<ArrowUp color={colors.secondary} size={20} />}
                  label={`${t('moveUp')} ${e.exercise.displayName}`}
                  disabled={mutation.isPending || index === 0}
                  onPress={() =>
                    run(() =>
                      programsApi.reorderExercises(
                        day.id,
                        moved(day.exercises, index, -1).map((item) => item.id),
                        locale,
                      ),
                    )
                  }
                />
                <IconButton
                  icon={<ArrowDown color={colors.secondary} size={20} />}
                  label={`${t('moveDown')} ${e.exercise.displayName}`}
                  disabled={
                    mutation.isPending || index === day.exercises.length - 1
                  }
                  onPress={() =>
                    run(() =>
                      programsApi.reorderExercises(
                        day.id,
                        moved(day.exercises, index, 1).map((item) => item.id),
                        locale,
                      ),
                    )
                  }
                />
                <IconButton
                  icon={<Trash2 color={colors.secondary} size={20} />}
                  label={`${t('removeExercise')} ${e.exercise.displayName}`}
                  disabled={mutation.isPending}
                  onPress={() =>
                    confirmation.ask(t('confirmRemoveExercise'), () =>
                      run(() => programsApi.removeExercise(e.id, locale)),
                    )
                  }
                />
              </View>
            </Card>
          ))}
          <Button
            label={t('addExercise')}
            disabled={mutation.isPending}
            onPress={() =>
              router.push({
                pathname: '/program/[id]/choose-exercise',
                params: { id, dayId: day.id },
              })
            }
          />
        </Card>
      ))}
      <Button
        label={t('addDay')}
        variant="secondary"
        disabled={mutation.isPending}
        onPress={() =>
          router.push({ pathname: '/program/[id]/day', params: { id } })
        }
      />
      {program.status !== 'active' ? (
        <Button
          label={t('activate')}
          busy={mutation.isPending}
          onPress={() => run(() => programsApi.activate(id, locale))}
        />
      ) : null}
      {program.status !== 'archived' ? (
        <Button
          label={t('archive')}
          variant="secondary"
          disabled={mutation.isPending}
          onPress={() =>
            program.status === 'active'
              ? confirmation.ask(t('confirmArchive'), () =>
                  run(() => programsApi.archive(id, locale)),
                )
              : run(() => programsApi.archive(id, locale))
          }
        />
      ) : null}
      {confirmation.dialog}
    </Screen>
  );
}
