import { useCallback, useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Button, colors, Screen, sizes, spacing, Text } from '@jimo/ui';
import {
  progressSummarySchema,
  progressWeeklySchema,
  progressRecordsSchema,
  progressExercisesSchema,
  workoutHistorySchema,
  type ProgressRange,
} from '@jimo/schemas';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { Field } from '../../src/programs/components';
import { useOffline } from '../../src/db/Provider';
import {
  useProgressQuery,
  useProgressPages,
  progressParams,
  usePendingProgress,
} from '../../src/progress/queries';
import {
  RangeSelector,
  SectionTitle,
  Metric,
  ProgressChart,
  RecordRow,
  CacheNotice,
  Unavailable,
} from '../../src/progress/components';
import {
  formatNumber,
  formatTrainingDuration,
  performanceText,
} from '../../src/progress/helpers';
export default function ProgressScreen() {
  const { t, i18n } = useTranslation('progress'),
    router = useRouter(),
    { runtime } = useOffline();
  const [range, setRange] = useState<ProgressRange>('8w'),
    [search, setSearch] = useState(''),
    [debounced, setDebounced] = useState(''),
    [historyStatus, setHistoryStatus] = useState<
      'completed' | 'cancelled' | 'all'
    >('completed');
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);
  const params = progressParams(range),
    summary = useProgressQuery(
      '/progress/summary',
      progressSummarySchema,
      params,
    ),
    weekly = useProgressQuery('/progress/weekly', progressWeeklySchema, params),
    pending = usePendingProgress();
  const records = useProgressPages(
    '/progress/prs',
    progressRecordsSchema,
    { ...params, limit: '6' },
    (p) => p.nextCursor,
  );
  const exercises = useProgressPages(
    '/progress/exercises',
    progressExercisesSchema,
    { ...params, search: debounced || undefined, limit: '15' },
    (p) => p.nextCursor,
  );
  const from = summary.data?.payload.period.from,
    to = summary.data?.payload.period.to;
  const history = useProgressPages(
    '/workouts',
    workoutHistorySchema,
    {
      limit: '15',
      status: historyStatus,
      since: from,
      until: to,
      dateField: 'completed',
    },
    (p) =>
      p.nextCursor ? `${p.nextCursor.startedAt}|${p.nextCursor.id}` : null,
    (cursor) => {
      const [cursorAt, cursorId] = cursor.split('|');
      return { cursorAt: cursorAt!, cursorId: cursorId! };
    },
  );
  const { refetch: refetchSummary } = summary,
    { refetch: refetchWeekly } = weekly,
    { refetch: refetchRecords } = records,
    { refetch: refetchExercises } = exercises,
    { refetch: refetchHistory } = history;
  const refresh = useCallback(() => {
    if (!runtime.owner) {
      void runtime.engine.request(true);
      return;
    }
    void refetchSummary();
    void refetchWeekly();
    void refetchRecords();
    void refetchExercises();
    void refetchHistory();
  }, [
    runtime,
    refetchSummary,
    refetchWeekly,
    refetchRecords,
    refetchExercises,
    refetchHistory,
  ]);
  useFocusEffect(
    useCallback(() => {
      if (runtime.owner) refresh();
    }, [runtime.owner, refresh]),
  );
  const s = summary.data?.payload,
    week = weekly.data?.payload.weeks ?? [],
    locale = i18n.language;
  const openExercise = (id: string) =>
    router.push({ pathname: '/progress/[id]', params: { id, range } });
  const staleRecords = records.data?.pages.find((p) => p.stale),
    staleExercises = exercises.data?.pages.find((p) => p.stale);
  const historyRows =
    history.data?.pages.flatMap((p) => p.payload.workouts) ?? [];
  return (
    <Screen
      bottomInset={false}
      contentStyle={{ padding: spacing.lg, gap: spacing.xl }}
    >
      <ScreenHeader title={t('title')} light />
      <RangeSelector value={range} onChange={setRange} />
      <CacheNotice
        stale={summary.data?.stale ?? false}
        {...(summary.data ? { fetchedAt: summary.data.fetchedAt } : {})}
      />
      {pending.data ? (
        <Text
          variant="caption"
          color={colors.secondary}
          accessibilityLiveRegion="polite"
        >
          {t('pendingSync')}
        </Text>
      ) : null}
      {!s ? (
        <Unavailable
          loading={summary.isPending && !!runtime.owner}
          retry={refresh}
        />
      ) : (
        <>
          <SectionTitle>{t('overview')}</SectionTitle>
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              columnGap: spacing.lg,
            }}
          >
            <Metric
              value={formatNumber(s.completedWorkouts, locale, 0)}
              label={t('workouts')}
            />
            <Metric
              value={formatTrainingDuration(s.trainingSeconds, locale)}
              label={t('time')}
            />
            <Metric
              value={formatNumber(s.completedSets, locale, 0)}
              label={t('sets')}
            />
            <Metric
              value={formatNumber(s.averageRpe, locale)}
              label={t('averageRpe')}
            />
          </View>
          <Text color={colors.secondary}>
            {t('frequencyValue', {
              value: formatNumber(s.sessionsPerWeek, locale),
            })}{' '}
            · {t('repsValue', { value: formatNumber(s.totalReps, locale, 0) })}
          </Text>
          {s.skippedSets ? (
            <Text variant="caption" color={colors.secondary}>
              {t('skippedValue', { count: s.skippedSets })}
            </Text>
          ) : null}
          {s.completedWorkouts === 0 ? (
            <View style={{ gap: spacing.md }}>
              <Text>{t('empty')}</Text>
              <Text variant="caption" color={colors.secondary}>
                {t('emptyPeriod')}
              </Text>
              <Button
                label={t('goWorkout')}
                onPress={() => router.push('/workout')}
              />
            </View>
          ) : null}
          {s.adherence ? (
            <View
              style={{
                gap: spacing.sm,
                borderTopWidth: 1,
                borderColor: colors.border,
                paddingTop: spacing.lg,
              }}
            >
              <SectionTitle>{t('adherence')}</SectionTitle>
              <Text variant="h3" color={colors.primarySoft}>
                {s.adherence.completed} / {s.adherence.planned} ·{' '}
                {formatNumber(s.adherence.percentage, locale)}%
              </Text>
              <Text variant="caption" color={colors.secondary}>
                {t('adherenceLimit')}
              </Text>
            </View>
          ) : null}
          {s.completedWorkouts > 0 ? (
            <>
              {weekly.data ? (
                <>
                  <ProgressChart
                    title={t('frequency')}
                    bars
                    points={week.map((w) => ({
                      label: w.weekStart,
                      value: w.completedWorkouts,
                    }))}
                  />
                  <ProgressChart
                    title={t('rpeTrend')}
                    points={week.map((w) => ({
                      label: w.weekStart,
                      value: w.averageRpe,
                    }))}
                  />
                  <CacheNotice
                    stale={weekly.data.stale}
                    fetchedAt={weekly.data.fetchedAt}
                  />
                </>
              ) : (
                <Unavailable
                  loading={weekly.isPending}
                  retry={() => void weekly.refetch()}
                />
              )}
              <SectionTitle>{t('records')}</SectionTitle>
              {records.data?.pages
                .flatMap((p) => p.payload.records)
                .map((r) => (
                  <RecordRow
                    key={`${r.exerciseId}:${r.trackingMode}:${r.loadMode}:${r.type}`}
                    record={r}
                    onPress={() => openExercise(r.exerciseId)}
                  />
                ))}
              {records.error ? (
                <Unavailable retry={() => void records.refetch()} />
              ) : null}
              {records.data &&
              !records.data.pages[0]?.payload.records.length ? (
                <Text color={colors.secondary}>{t('noRecords')}</Text>
              ) : null}
              {staleRecords ? (
                <CacheNotice stale fetchedAt={staleRecords.fetchedAt} />
              ) : null}
              {records.hasNextPage ? (
                <Button
                  label={t('moreRecords')}
                  variant="secondary"
                  disabled={records.isFetching}
                  onPress={() => void records.fetchNextPage()}
                />
              ) : null}
              <SectionTitle>{t('exercises')}</SectionTitle>
              <Field
                label={t('search')}
                value={search}
                onChangeText={setSearch}
                maxLength={100}
              />
              {exercises.data?.pages
                .flatMap((p) => p.payload.exercises)
                .map((e) => (
                  <Pressable
                    key={e.id}
                    accessibilityRole="button"
                    accessibilityLabel={`${e.displayName}, ${performanceText(e.latest, locale)}${e.trend ? `, ${e.trend === 'same' ? t('trend.same') : t(`trendMetrics.${e.latest.trackingMode === 'duration' ? 'duration' : e.latest.loadMode}.${e.trend}`)}` : ''}`}
                    onPress={() => openExercise(e.id)}
                    style={{
                      minHeight: sizes.touch,
                      paddingVertical: spacing.md,
                      gap: spacing.xs,
                      borderBottomWidth: 1,
                      borderColor: colors.border,
                    }}
                  >
                    <Text variant="bodyMedium">{e.displayName}</Text>
                    <Text variant="caption" color={colors.secondary}>
                      {t('last')} · {performanceText(e.latest, locale)}
                      {e.trend
                        ? ` · ${e.trend === 'same' ? t('trend.same') : t(`trendMetrics.${e.latest.trackingMode === 'duration' ? 'duration' : e.latest.loadMode}.${e.trend}`)}`
                        : ''}
                    </Text>
                  </Pressable>
                ))}
              {exercises.error ? (
                <Unavailable retry={() => void exercises.refetch()} />
              ) : null}
              {exercises.data &&
              !exercises.data.pages[0]?.payload.exercises.length ? (
                <Text color={colors.secondary}>{t('noExercises')}</Text>
              ) : null}
              {staleExercises ? (
                <CacheNotice stale fetchedAt={staleExercises.fetchedAt} />
              ) : null}
              {exercises.hasNextPage ? (
                <Button
                  label={t('moreExercises')}
                  variant="secondary"
                  disabled={exercises.isFetching}
                  onPress={() => void exercises.fetchNextPage()}
                />
              ) : null}
            </>
          ) : null}
        </>
      )}
      <SectionTitle>{t('history')}</SectionTitle>
      <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
        {(['completed', 'cancelled', 'all'] as const).map((status) => (
          <Button
            key={status}
            label={t(`historyStatus.${status}`)}
            variant={historyStatus === status ? 'primary' : 'secondary'}
            onPress={() => setHistoryStatus(status)}
          />
        ))}
      </View>
      {historyRows.map((w) => (
        <Pressable
          key={w.id}
          accessibilityRole="button"
          accessibilityLabel={t('sessionDetails')}
          onPress={() =>
            router.push({ pathname: '/workout/[id]', params: { id: w.id } })
          }
          style={{
            minHeight: sizes.touch,
            gap: spacing.xs,
            paddingVertical: spacing.md,
            borderBottomWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text variant="bodyMedium">{w.name}</Text>
          <Text variant="caption" color={colors.secondary}>
            {new Date(w.completedAt ?? w.startedAt).toLocaleDateString(locale, {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}{' '}
            ·{' '}
            {formatTrainingDuration(
              w.completedAt
                ? Math.max(
                    0,
                    (Date.parse(w.completedAt) - Date.parse(w.startedAt)) /
                      1000,
                  )
                : null,
              locale,
            )}
          </Text>
          <Text variant="caption" color={colors.secondary}>
            {t('historyCounts', {
              exercises: w.exercisesCount,
              sets: w.completedSets,
            })}{' '}
            ·{' '}
            {t(
              `historyStatus.${w.status === 'cancelled' ? 'cancelled' : 'completed'}`,
            )}
          </Text>
        </Pressable>
      ))}
      {history.error ? (
        <Unavailable retry={() => void history.refetch()} />
      ) : null}
      {history.data && !historyRows.length ? (
        <Text color={colors.secondary}>{t('noHistory')}</Text>
      ) : null}
      {history.hasNextPage ? (
        <Button
          label={t('moreHistory')}
          variant="secondary"
          disabled={history.isFetching}
          onPress={() => void history.fetchNextPage()}
        />
      ) : null}
      <CacheNotice
        stale={history.data?.pages.some((p) => p.stale) ?? false}
        {...(history.data?.pages[0]
          ? { fetchedAt: history.data.pages[0].fetchedAt }
          : {})}
      />
    </Screen>
  );
}
