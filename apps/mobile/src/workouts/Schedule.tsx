import { useCallback, useState } from 'react';
import { ScrollView, Pressable, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Button, colors, spacing, Text } from '@jimo/ui';
import { useOffline } from '../db/Provider';
import { SyncStatus } from '../db/Status';
import { ErrorNotice } from '../programs/components';
import { useActiveWorkout, useHistory, useCachedProgram } from './queries';
import { StartWorkout } from './components';
import { localWeekday, weekBounds, weekSchedule } from './helpers';
import { useClock } from './useClock';
import Dumbbell from 'lucide-react-native/icons/dumbbell';
import { EmptyState } from '../components/EmptyState';
export function WorkoutSchedule({ home = false }: { home?: boolean }) {
  const { t } = useTranslation(['workouts', 'programs']),
    { t: common } = useTranslation('common'),
    router = useRouter();
  const { runtime } = useOffline();
  const detail = useCachedProgram(),
    active = detail.data;
  const session = useActiveWorkout();
  const { refetch: refreshSession } = session;
  const refresh = useCallback(() => {
    void refreshSession();
    void runtime.engine.request(true);
  }, [refreshSession, runtime]);
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );
  const now = useClock(refresh),
    date = new Date(now),
    { start, end } = weekBounds(date),
    history = useHistory(start.toISOString(), end.toISOString(), 'completed');
  const [selected, setSelected] = useState<number | null>(null);
  const week = weekSchedule(
    detail.data?.days ?? [],
    history.data?.workouts ?? [],
    active?.id ?? '',
    date,
  );
  if (detail.isPending || session.isPending) return <Text>{t('loading')}</Text>;
  if (session.error || detail.error)
    return (
      <ErrorNotice error={session.error ?? detail.error} retry={refresh} />
    );
  const weekday = selected ?? localWeekday(date);
  const weekly = home ? (
    <>
      <Text variant="label" color={colors.secondary}>
        {t('week')}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        {week.map((day) => {
          const scheduled = day.days.length > 0,
            state = [
              day.today ? t('weekState.today') : null,
              scheduled ? t('weekState.scheduled') : t('weekState.rest'),
              day.completed ? t('weekState.completed') : null,
            ]
              .filter(Boolean)
              .join(', ');
          return (
            <Pressable
              key={day.weekday}
              accessibilityRole="button"
              accessibilityLabel={t('weekDay', {
                day: t(`programs:weekdays.${day.weekday}`),
                state,
              })}
              accessibilityState={{ selected: weekday === day.weekday }}
              onPress={() => setSelected(day.weekday)}
              style={{
                flexGrow: 1,
                minWidth: 48,
                minHeight: 72,
                alignItems: 'center',
                justifyContent: 'center',
                gap: spacing.xs,
                borderBottomWidth: day.today ? 2 : 1,
                borderColor: day.today ? colors.primarySoft : colors.border,
                backgroundColor:
                  weekday === day.weekday ? colors.elevated : 'transparent',
              }}
            >
              <Text
                variant="caption"
                color={scheduled ? colors.primarySoft : colors.secondary}
              >
                {t(`programs:weekdaysShort.${day.weekday}`).toUpperCase()}
              </Text>
              <Text
                color={day.completed ? colors.primarySoft : colors.secondary}
              >
                {day.completed ? '✓' : scheduled ? '●' : '·'}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      {history.error ? (
        <ErrorNotice
          error={history.error}
          retry={() => void history.refetch()}
        />
      ) : null}
    </>
  ) : null;
  const activeWorkout = session.data?.workout;
  if (activeWorkout)
    return (
      <View style={{ gap: spacing.lg }}>
        <SyncStatus />
        <Text variant="label" color={colors.primarySoft}>
          {t('resume')}
        </Text>
        <Text variant="h1">{activeWorkout.name}</Text>
        <Text color={colors.secondary}>
          {t('exerciseCount', { count: activeWorkout.exercisesCount })} ·{' '}
          {t('completedSets')}: {activeWorkout.completedSets}
        </Text>
        <Button
          label={t('resume')}
          onPress={() =>
            router.push({
              pathname: '/workout/[id]',
              params: { id: activeWorkout.id },
            })
          }
        />
        {weekly}
      </View>
    );
  if (!active || !detail.data) {
    if (!runtime.online || !runtime.owner)
      return (
        <View style={{ gap: spacing.md }}>
          <SyncStatus />
          <Text>{t('offline.connect')}</Text>
        </View>
      );
    if (home)
      return (
        <EmptyState
          icon={<Dumbbell color={colors.primarySoft} size={32} />}
          title={common('home.empty')}
          description={common('home.description')}
        >
          <Button
            label={common('home.create')}
            onPress={() => router.push('/program/manual')}
          />
        </EmptyState>
      );
    return (
      <View style={{ gap: spacing.lg }}>
        <SyncStatus />
        <Text variant="h3">{t('noProgram')}</Text>
        <Button
          label={t('viewProgram')}
          onPress={() => router.push('/program')}
        />
      </View>
    );
  }
  const hasWeekdays = detail.data.days.some((d) => d.dayOfWeek !== null);
  const days =
    home && hasWeekdays
      ? detail.data.days.filter((d) => d.dayOfWeek === weekday)
      : detail.data.days;
  return (
    <View style={{ gap: spacing.lg }}>
      <SyncStatus />
      {weekly}
      <Text variant="label" color={colors.secondary}>
        {home && hasWeekdays && weekday === localWeekday(date)
          ? t('today')
          : t('activeProgram')}
      </Text>
      <Text variant="h2">{active.name}</Text>
      {!hasWeekdays && home ? (
        <>
          <Text color={colors.secondary}>{t('unscheduled')}</Text>
          <Button
            label={t('choose')}
            onPress={() =>
              router.push({
                pathname: '/program/[id]',
                params: { id: active.id },
              })
            }
          />
        </>
      ) : (
        <>
          {!days.length ? (
            <>
              <Text color={colors.secondary}>{t('restDay')}</Text>
              <Button
                variant="secondary"
                label={t('choose')}
                onPress={() => router.push('/workout')}
              />
            </>
          ) : (
            days.map((day) => (
              <View
                key={day.id}
                style={{
                  gap: spacing.sm,
                  paddingVertical: spacing.md,
                  borderTopWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Text variant="h2">{day.name}</Text>
                <Text variant="caption" color={colors.secondary}>
                  {t('exerciseCount', { count: day.exercises.length })}
                  {day.dayOfWeek
                    ? ` · ${t(`programs:weekdays.${day.dayOfWeek as 1 | 2 | 3 | 4 | 5 | 6 | 7}`)}`
                    : ''}
                </Text>
                {home
                  ? day.exercises.map((e) => (
                      <Text key={e.id} color={colors.secondary}>
                        {e.exercise.displayName}
                      </Text>
                    ))
                  : null}
                <StartWorkout dayId={day.id} disabled={!day.exercises.length} />
              </View>
            ))
          )}
        </>
      )}
    </View>
  );
}
