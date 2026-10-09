import { useCallback, useEffect, useState } from 'react';
import { TextInput, View } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  progressSummarySchema,
  progressWeeklySchema,
  progressRecordsSchema,
  progressExercisesSchema,
  workoutHistorySchema,
  type ProgressRange,
} from '@jimo/schemas';
import { useOffline } from '../db/Provider';
import {
  useProgressQuery,
  useProgressPages,
  progressParams,
  usePendingProgress,
} from '../progress/queries';
import {
  formatNumber,
  formatTrainingDuration,
  performanceText,
} from '../progress/helpers';
import { EditorialScreen, Copy, PaperCard, EditorialText } from './Surface';
import { ProgressHero } from './Heroes';
import {
  Action,
  CacheNote,
  DataNotice,
  PeriodSelector,
  HistoryFilter,
  ProgressTabs,
  SectionHeading,
  type ProgressTab,
} from './Controls';
import { StatCard, PersonalRecordRow, DataRow } from './ProgressCards';
import { VolumePanel } from './VolumePanel';
import { ink } from './theme';
export default function ProgressScreen() {
  const { t, i18n } = useTranslation(['progressProfile', 'progress']),
    router = useRouter(),
    { runtime } = useOffline();
  const [tab, setTab] = useState<ProgressTab>('overview');
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
  const recordRows =
      records.data?.pages.flatMap((p) => p.payload.records) ?? [],
    exerciseRows =
      exercises.data?.pages.flatMap((p) => p.payload.exercises) ?? [];
  // Weekly keys are local calendar dates, not UTC instants.
  const weeklyPoints = (
    key:
      'completedWorkouts' | 'completedSets' | 'trainingSeconds' | 'averageRpe',
  ) =>
    week.map((w) => ({
      label: new Date(`${w.weekStart}T12:00:00`).toLocaleDateString(locale, {
        day: 'numeric',
        month: 'short',
      }),
      value: w[key],
    }));
  const periodCaption = s
    ? `${new Date(s.period.from).toLocaleDateString(locale, { day: 'numeric', month: 'short' })} – ${new Date(s.period.to).toLocaleDateString(locale, { day: 'numeric', month: 'short' })}`
    : '';
  const recordsCard = (
    <PaperCard style={{ gap: 4 }}>
      <SectionHeading>{t('personalRecords')}</SectionHeading>
      {recordRows.map((r) => (
        <PersonalRecordRow
          key={`${r.exerciseId}:${r.trackingMode}:${r.loadMode}:${r.type}`}
          record={r}
          {...(exerciseRows.find((e) => e.id === r.exerciseId)
            ? {
                latest: exerciseRows.find((e) => e.id === r.exerciseId)!.latest,
              }
            : {})}
          onPress={() => openExercise(r.exerciseId)}
        />
      ))}
      {records.error && !records.data ? (
        <DataNotice retry={() => void records.refetch()} />
      ) : !recordRows.length ? (
        <Copy>
          {t(
            records.isPending && !!runtime.owner
              ? 'progress:loading'
              : 'progress:noRecords',
          )}
        </Copy>
      ) : null}
      {records.data?.pages.map((p, i) => (
        <CacheNote key={i} stale={p.stale} fetchedAt={p.fetchedAt} />
      ))}
      {records.hasNextPage ? (
        <Action
          label={t('progress:moreRecords')}
          disabled={records.isFetching}
          onPress={() => void records.fetchNextPage()}
        />
      ) : null}
    </PaperCard>
  );
  return (
    <EditorialScreen>
      <ProgressHero />
      <ProgressTabs value={tab} onChange={setTab} />
      <PeriodSelector value={range} onChange={setRange} />
      <CacheNote
        stale={summary.data?.stale ?? false}
        {...(summary.data ? { fetchedAt: summary.data.fetchedAt } : {})}
      />
      {pending.data ? (
        <Copy accessibilityLiveRegion="polite">
          {t('progress:pendingSync')}
        </Copy>
      ) : null}
      <View testID="progress-content" style={{ gap: 10 }}>
        {!s ? (
          <PaperCard>
            <DataNotice
              loading={summary.isPending && !!runtime.owner}
              retry={refresh}
            />
          </PaperCard>
        ) : (
          <>
            {s.completedWorkouts === 0 ? (
              <PaperCard style={{ gap: 8 }}>
                <Copy>{t('progress:empty')}</Copy>
                <Copy>{t('progress:emptyPeriod')}</Copy>
                <Action
                  label={t('progress:goWorkout')}
                  onPress={() => router.push('/workout')}
                />
              </PaperCard>
            ) : null}
            {tab === 'overview' ? (
              <>
                <StatCard
                  testID="workouts-stat"
                  label={t('progress:workouts')}
                  value={formatNumber(s.completedWorkouts, locale, 0)}
                  caption={periodCaption}
                  points={weeklyPoints('completedWorkouts')}
                  bars
                />
                <StatCard
                  testID="global-volume-stat"
                  label={t('totalVolume')}
                  value="—"
                  caption={t('globalVolumeUnavailable')}
                />
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'stretch',
                    gap: 10,
                  }}
                >
                  <StatCard
                    small
                    label={t('completedSets')}
                    value={formatNumber(s.completedSets, locale, 0)}
                    points={weeklyPoints('completedSets')}
                    bars
                  />
                  <StatCard
                    small
                    label={t('trainingTime')}
                    value={formatTrainingDuration(s.trainingSeconds, locale)}
                    points={weeklyPoints('trainingSeconds')}
                    format={(v) => formatTrainingDuration(v, locale)}
                  />
                </View>
                {recordsCard}
              </>
            ) : null}
            {tab === 'strength' ? (
              <>
                {recordsCard}
                <PaperCard style={{ gap: 10 }}>
                  <SectionHeading>{t('progress:exercises')}</SectionHeading>
                  <Copy>{t('progress:search')}</Copy>
                  <TextInput
                    accessibilityLabel={t('progress:search')}
                    value={search}
                    onChangeText={setSearch}
                    maxLength={100}
                    style={{
                      minHeight: 48,
                      borderWidth: 1,
                      borderColor: ink.border,
                      color: ink.charcoal,
                      padding: 12,
                      fontFamily: 'Inter_400Regular',
                      borderRadius: 6,
                      fontSize: 14,
                    }}
                  />
                  {exerciseRows.map((e) => (
                    <DataRow
                      key={e.id}
                      title={e.displayName}
                      subtitle={`${t('progress:last')} · ${performanceText(e.latest, locale)}${e.trend ? ` · ${e.trend === 'same' ? t('progress:trend.same') : t(`progress:trendMetrics.${e.latest.trackingMode === 'duration' ? 'duration' : e.latest.loadMode}.${e.trend}`)}` : ''}`}
                      onPress={() => openExercise(e.id)}
                    />
                  ))}
                  {exercises.error && !exercises.data ? (
                    <DataNotice retry={() => void exercises.refetch()} />
                  ) : !exerciseRows.length ? (
                    <Copy>{t('progress:noExercises')}</Copy>
                  ) : null}
                  {exercises.data?.pages.map((p, i) => (
                    <CacheNote
                      key={i}
                      stale={p.stale}
                      fetchedAt={p.fetchedAt}
                    />
                  ))}
                  {exercises.hasNextPage ? (
                    <Action
                      label={t('progress:moreExercises')}
                      disabled={exercises.isFetching}
                      onPress={() => void exercises.fetchNextPage()}
                    />
                  ) : null}
                </PaperCard>
              </>
            ) : null}
            <View style={{ display: tab === 'volume' ? 'flex' : 'none' }}>
              <VolumePanel range={range} active={tab === 'volume'} />
            </View>
            {tab === 'frequency' ? (
              <>
                <StatCard
                  label={t('progress:frequency')}
                  value={formatNumber(s.sessionsPerWeek, locale)}
                  caption={t('sessionsPerWeek')}
                  points={weeklyPoints('completedWorkouts')}
                  bars
                />
                {s.adherence ? (
                  <PaperCard style={{ gap: 6 }}>
                    <SectionHeading>{t('progress:adherence')}</SectionHeading>
                    <EditorialText style={{ fontSize: 30 }}>
                      {s.adherence.completed} / {s.adherence.planned} ·{' '}
                      {formatNumber(s.adherence.percentage, locale)}%
                    </EditorialText>
                    <Copy>{t('progress:adherenceLimit')}</Copy>
                  </PaperCard>
                ) : null}
                <StatCard
                  label={t('progress:averageRpe')}
                  value={formatNumber(s.averageRpe, locale)}
                  points={weeklyPoints('averageRpe')}
                />
                <PaperCard style={{ gap: 4 }}>
                  <Copy>
                    {t('progress:repsValue', {
                      value: formatNumber(s.totalReps, locale, 0),
                    })}
                  </Copy>
                  {s.skippedSets ? (
                    <Copy>
                      {t('progress:skippedValue', { count: s.skippedSets })}
                    </Copy>
                  ) : null}
                </PaperCard>
              </>
            ) : null}
          </>
        )}
        {tab === 'frequency' ? (
          <PaperCard style={{ gap: 10 }}>
            <SectionHeading>{t('historyTitle')}</SectionHeading>
            <HistoryFilter value={historyStatus} onChange={setHistoryStatus} />
            {history.data?.pages
              .flatMap((p) => p.payload.workouts)
              .map((w) => (
                <DataRow
                  key={w.id}
                  title={w.name}
                  subtitle={`${new Date(w.completedAt ?? w.startedAt).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })} · ${formatTrainingDuration(w.completedAt ? Math.max(0, (Date.parse(w.completedAt) - Date.parse(w.startedAt)) / 1000) : null, locale)} · ${t('progress:historyCounts', { exercises: w.exercisesCount, sets: w.completedSets })} · ${t(`progress:historyStatus.${w.status === 'cancelled' ? 'cancelled' : 'completed'}`)}`}
                  onPress={() =>
                    router.push({
                      pathname: '/workout/[id]',
                      params: { id: w.id },
                    })
                  }
                />
              ))}
            {history.error && !history.data ? (
              <DataNotice retry={() => void history.refetch()} />
            ) : history.data &&
              !history.data.pages.some((p) => p.payload.workouts.length) ? (
              <Copy>{t('progress:noHistory')}</Copy>
            ) : null}
            {history.hasNextPage ? (
              <Action
                label={t('progress:moreHistory')}
                disabled={history.isFetching}
                onPress={() => void history.fetchNextPage()}
              />
            ) : null}
            {history.data?.pages.map((p, i) => (
              <CacheNote key={i} stale={p.stale} fetchedAt={p.fetchedAt} />
            ))}
          </PaperCard>
        ) : null}
        {weekly.error && !weekly.data ? (
          <DataNotice retry={() => void weekly.refetch()} />
        ) : null}
        <CacheNote
          stale={weekly.data?.stale ?? false}
          {...(weekly.data ? { fetchedAt: weekly.data.fetchedAt } : {})}
        />
      </View>
    </EditorialScreen>
  );
}
