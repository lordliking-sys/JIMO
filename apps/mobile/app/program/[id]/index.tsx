import { StartWorkout } from '../../../src/workouts/components';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Screen, Text, Button, Card, colors, spacing, radius } from '@jimo/ui';
import {
  useProgram,
  useProgramMutation,
  useApiLocale,
} from '../../../src/api/queries';
import { programsApi } from '../../../src/api/programs';
import {
  Back,
  ActionMenu,
  QueryState,
  ErrorNotice,
  useConfirmation,
} from '../../../src/programs/components';
import { moved, statusKey } from '../../../src/programs/helpers';
import { calendarDateLabel } from '../../../src/programs/date';
import { exerciseSummary } from '../../../src/programs/summary';

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
  const archive = () =>
    program.status === 'active'
      ? confirmation.ask(t('confirmArchive'), () =>
          run(() => programsApi.archive(id, locale)),
        )
      : run(() => programsApi.archive(id, locale));
  return (
    <Screen contentStyle={{ padding: spacing.lg, gap: spacing.lg }}>
      <View style={styles.header}>
        <View style={styles.row}>
          <Back compact />
          <Text
            variant="caption"
            color={colors.secondary}
            style={[styles.eyebrow, { flex: 1 }]}
          >
            {t('title').toUpperCase()}
          </Text>
          <ActionMenu
            label={t('programActions')}
            title={program.name}
            disabled={mutation.isPending}
            actions={[
              {
                label: t('editProgram'),
                action: () =>
                  router.push({
                    pathname: '/program/[id]/settings',
                    params: { id },
                  }),
              },
              ...(program.status !== 'archived'
                ? [{ label: t('archive'), action: archive }]
                : []),
            ]}
          />
        </View>
        <View style={{ gap: spacing.sm }}>
          <Text variant="h1" accessibilityRole="header">
            {program.name}
          </Text>
          <View style={styles.badge}>
            <Text
              variant="caption"
              color={
                program.status === 'active'
                  ? colors.primarySoft
                  : colors.secondary
              }
            >
              {t(statusKey(program.status))}
            </Text>
          </View>
        </View>
        {program.description ? (
          <Text variant="caption" color={colors.secondary}>
            {program.description}
          </Text>
        ) : null}
        <View style={styles.metadata}>
          <View style={styles.meta}>
            <Text variant="caption" color={colors.secondary}>
              {t('durationLabel')}
            </Text>
            <Text variant="bodyMedium">
              {program.durationWeeks
                ? t('weekCount', { count: program.durationWeeks })
                : t('unspecified')}
            </Text>
          </View>
          <View style={styles.meta}>
            <Text variant="caption" color={colors.secondary}>
              {t('startLabel')}
            </Text>
            <Text variant="bodyMedium">
              {program.startsOn
                ? calendarDateLabel(program.startsOn, locale)
                : t('unspecified')}
            </Text>
          </View>
        </View>
      </View>
      {mutation.error ? <ErrorNotice error={mutation.error} /> : null}
      {!program.days.length ? (
        <Card style={styles.day}>
          <Text variant="h3">{t('noDays')}</Text>
          <Text variant="caption" color={colors.secondary}>
            {t('noDaysHint')}
          </Text>
        </Card>
      ) : null}
      {program.days.map((day, dayIndex) => (
        <Card key={day.id} style={styles.day}>
          <View style={styles.row}>
            <View style={{ flex: 1, gap: spacing.xs }}>
              <Text
                variant="caption"
                color={colors.primarySoft}
                style={styles.eyebrow}
              >
                {t('dayNumber', { count: dayIndex + 1 })}
              </Text>
              <Text variant="h2" accessibilityRole="header">
                {day.name}
              </Text>
              <Text variant="caption" color={colors.secondary}>
                {t('exerciseCount', { count: day.exercises.length })}
                {day.dayOfWeek
                  ? ` · ${t(`weekdays.${day.dayOfWeek as 1 | 2 | 3 | 4 | 5 | 6 | 7}`)}`
                  : ''}
              </Text>
            </View>
            <ActionMenu
              label={t('dayActions', { name: day.name })}
              title={day.name}
              disabled={mutation.isPending}
              actions={[
                {
                  label: t('editDay'),
                  action: () =>
                    router.push({
                      pathname: '/program/[id]/day',
                      params: { id, dayId: day.id },
                    }),
                },
                {
                  label: `${t('moveUp')} ${day.name}`,
                  disabled: dayIndex === 0,
                  action: () =>
                    run(() =>
                      programsApi.reorderDays(
                        id,
                        moved(program.days, dayIndex, -1).map((d) => d.id),
                        locale,
                      ),
                    ),
                },
                {
                  label: `${t('moveDown')} ${day.name}`,
                  disabled: dayIndex === program.days.length - 1,
                  action: () =>
                    run(() =>
                      programsApi.reorderDays(
                        id,
                        moved(program.days, dayIndex, 1).map((d) => d.id),
                        locale,
                      ),
                    ),
                },
                {
                  label: t('deleteDay'),
                  action: () =>
                    day.exercises.length
                      ? confirmation.ask(t('confirmDeleteDay'), () =>
                          run(() => programsApi.removeDay(day.id, locale)),
                        )
                      : run(() => programsApi.removeDay(day.id, locale)),
                },
              ]}
            />
          </View>
          {day.notes ? (
            <Text variant="caption" color={colors.secondary}>
              {day.notes}
            </Text>
          ) : null}
          {day.exercises.map((exercise, index) => {
            const summary = exerciseSummary(exercise, locale, t);
            const edit = () =>
              router.push({
                pathname: '/program/[id]/exercise',
                params: {
                  id,
                  dayId: day.id,
                  exerciseId: exercise.exerciseId,
                  prescriptionId: exercise.id,
                },
              });
            return (
              <View key={exercise.id} style={styles.exercise}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${t('editExercise')} ${exercise.exercise.displayName}`}
                  accessibilityHint={t('editPrescriptionHint')}
                  disabled={mutation.isPending}
                  accessibilityState={{ disabled: mutation.isPending }}
                  onPress={edit}
                  style={({ pressed }) => [
                    styles.prescription,
                    { opacity: pressed ? 0.7 : 1 },
                  ]}
                >
                  <Text variant="bodyMedium">
                    {exercise.exercise.displayName}
                  </Text>
                  <Text variant="bodyMedium" color={colors.primarySoft}>
                    {summary.primary}
                  </Text>
                  {summary.details ? (
                    <Text variant="caption" color={colors.secondary}>
                      {summary.details}
                    </Text>
                  ) : null}
                  {exercise.notes ? (
                    <Text variant="caption" color={colors.secondary}>
                      {exercise.notes}
                    </Text>
                  ) : null}
                </Pressable>
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
              </View>
            );
          })}
          {!day.exercises.length ? (
            <Text variant="caption" color={colors.secondary}>
              {t('noDayExercises')}
            </Text>
          ) : null}
          {program.status === 'active' ? (
            <StartWorkout dayId={day.id} disabled={!day.exercises.length} />
          ) : null}
          <Button
            label={t('addExercise')}
            variant="secondary"
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
      {confirmation.dialog}
    </Screen>
  );
}
const styles = StyleSheet.create({
  header: {
    gap: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  eyebrow: { letterSpacing: 1 },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.small,
    backgroundColor: colors.elevated,
  },
  metadata: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
  meta: { flex: 1, minWidth: 100, gap: spacing.xs },
  day: { padding: spacing.lg, gap: spacing.md },
  exercise: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingVertical: spacing.md,
  },
  prescription: {
    flex: 1,
    minHeight: 48,
    gap: spacing.xs,
    justifyContent: 'center',
  },
});
