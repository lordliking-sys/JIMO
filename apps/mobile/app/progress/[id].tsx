import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Button, colors, Screen, sizes, spacing, Text } from '@jimo/ui';
import {
  progressExerciseDetailSchema,
  progressRanges,
  type ProgressRange,
} from '@jimo/schemas';
import {
  useProgressQuery,
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
  chartMetric,
  formatHold,
  formatKg,
  formatNumber,
  modeKey,
  performanceText,
  recordText,
} from '../../src/progress/helpers';
export default function ExerciseProgressScreen() {
  const params = useLocalSearchParams<{ id: string; range?: string }>(),
    router = useRouter(),
    { t, i18n } = useTranslation('progress');
  const [range, setRange] = useState<ProgressRange>(
      progressRanges.includes(params.range as ProgressRange)
        ? (params.range as ProgressRange)
        : '8w',
    ),
    [selected, setSelected] = useState<string | null>(null);
  const query = useProgressQuery(
    `/progress/exercises/${params.id}`,
    progressExerciseDetailSchema,
    progressParams(range),
  );
  const pending = usePendingProgress();
  const detail = query.data?.payload,
    locale = i18n.language,
    mode =
      detail?.modes.find((m) => modeKey(m) === selected) ?? detail?.modes[0],
    metric = mode ? chartMetric(mode) : null;
  const primary = mode?.records.find(
    (r) =>
      r.type ===
      (mode.trackingMode === 'duration'
        ? 'MAX_DURATION'
        : mode.loadMode === 'bodyweight'
          ? 'MAX_REPS'
          : mode.loadMode === 'assisted'
            ? 'MIN_ASSISTANCE'
            : 'MAX_LOAD'),
  );
  return (
    <Screen contentStyle={{ padding: spacing.lg, gap: spacing.xl }}>
      <Button
        label={t('back')}
        variant="secondary"
        onPress={() =>
          router.canGoBack() ? router.back() : router.replace('/progress')
        }
      />
      <Text variant="h1" accessibilityRole="header">
        {detail?.exercise.displayName ?? t('exerciseDetail')}
      </Text>
      <RangeSelector value={range} onChange={setRange} />
      <CacheNotice
        stale={query.data?.stale ?? false}
        {...(query.data ? { fetchedAt: query.data.fetchedAt } : {})}
      />
      {pending.data ? (
        <Text variant="caption" color={colors.secondary}>
          {t('pendingSync')}
        </Text>
      ) : null}
      {!detail ? (
        <Unavailable
          loading={query.isPending && query.fetchStatus === 'fetching'}
          retry={() => void query.refetch()}
        />
      ) : !mode ? (
        <Text color={colors.secondary}>{t('noExercisePeriod')}</Text>
      ) : (
        <>
          {detail.modes.length > 1 ? (
            <View style={{ gap: spacing.sm }}>
              <SectionTitle>{t('mode')}</SectionTitle>
              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: spacing.sm,
                }}
                accessibilityRole="radiogroup"
                accessibilityLabel={t('mode')}
              >
                {detail.modes.map((m) => (
                  <Pressable
                    key={modeKey(m)}
                    accessibilityRole="radio"
                    aria-checked={modeKey(m) === modeKey(mode)}
                    accessibilityState={{
                      checked: modeKey(m) === modeKey(mode),
                    }}
                    onPress={() => setSelected(modeKey(m))}
                    style={{
                      minHeight: sizes.touch,
                      paddingHorizontal: spacing.md,
                      justifyContent: 'center',
                      backgroundColor:
                        modeKey(m) === modeKey(mode)
                          ? colors.surface
                          : colors.background,
                      borderWidth: 1,
                      borderColor:
                        modeKey(m) === modeKey(mode)
                          ? colors.activeBorder
                          : colors.border,
                    }}
                  >
                    <Text
                      variant="label"
                      color={
                        modeKey(m) === modeKey(mode)
                          ? colors.primarySoft
                          : colors.secondary
                      }
                    >
                      {t(`modes.${m.loadMode}`)}
                      {detail.trackingModes.length > 1
                        ? ` · ${t(m.trackingMode === 'reps' ? 'reps' : 'duration')}`
                        : ''}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}
          <SectionTitle>{t(`modes.${mode.loadMode}`)}</SectionTitle>
          <View style={{ gap: spacing.md }}>
            <Text variant="caption" color={colors.secondary}>
              {t('pr')}
            </Text>
            <Text variant="h2" color={colors.primarySoft}>
              {primary ? recordText(primary, locale) : '—'}
            </Text>
            <Text variant="caption" color={colors.secondary}>
              {t('last')}
            </Text>
            <Text variant="h3">{performanceText(mode.latest, locale)}</Text>
          </View>
          <View
            style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg }}
          >
            <Metric
              value={formatNumber(mode.sessions, locale, 0)}
              label={t('sessions')}
            />
            <Metric
              value={formatNumber(mode.completedSets, locale, 0)}
              label={t('sets')}
            />
            {mode.trackingMode === 'duration' ? (
              <>
                <Metric
                  value={formatHold(mode.averageDurationSeconds)}
                  label={t('averageDuration')}
                />
                <Metric
                  value={formatHold(mode.totalDurationSeconds)}
                  label={t('totalDuration')}
                />
              </>
            ) : (
              <Metric
                value={formatNumber(mode.totalReps, locale, 0)}
                label={t('reps')}
              />
            )}
          </View>
          <Text color={colors.secondary}>
            {t('frequencyValue', {
              value: formatNumber(mode.sessionsPerWeek, locale),
            })}
          </Text>
          {mode.loadVolume !== null ? (
            <View style={{ gap: spacing.xs }}>
              <Text variant="h3">
                {formatNumber(Number(mode.loadVolume), locale, 2)} kg·reps
              </Text>
              <Text variant="caption" color={colors.secondary}>
                {t(
                  mode.loadMode === 'weighted'
                    ? 'weightedVolume'
                    : 'externalVolume',
                )}
              </Text>
            </View>
          ) : null}
          {metric ? (
            <ProgressChart
              title={t(
                mode.trackingMode === 'duration'
                  ? 'durationTrend'
                  : `chart.${mode.loadMode}`,
              )}
              points={mode.timeline.map((p) => ({
                label: new Date(p.date).toLocaleDateString(locale, {
                  day: 'numeric',
                  month: 'short',
                }),
                value: p[metric.key] === null ? null : Number(p[metric.key]),
              }))}
              format={(value) =>
                metric.unit === 'duration'
                  ? formatHold(value)
                  : metric.unit === 'kg'
                    ? `${formatKg(value.toFixed(2), locale)} kg`
                    : `${formatNumber(value, locale, 0)} reps`
              }
            />
          ) : null}
          {mode.loadMode === 'assisted' ? (
            <Text variant="caption" color={colors.secondary}>
              {t('assistanceNote')}
            </Text>
          ) : null}
          {mode.timelineTruncated ? (
            <Text variant="caption" color={colors.secondary}>
              {t('timelineLimit')}
            </Text>
          ) : null}
          <SectionTitle>{t('records')}</SectionTitle>
          {mode.records.map((r) => (
            <RecordRow
              key={r.type}
              record={r}
              onPress={() =>
                router.push({
                  pathname: '/workout/[id]',
                  params: { id: r.sessionId },
                })
              }
            />
          ))}
          <SectionTitle>{t('sessions')}</SectionTitle>
          {[...mode.timeline].reverse().map((point) => (
            <Pressable
              key={point.sessionId}
              accessibilityRole="button"
              onPress={() =>
                router.push({
                  pathname: '/workout/[id]',
                  params: { id: point.sessionId },
                })
              }
              style={{
                minHeight: sizes.touch,
                paddingVertical: spacing.md,
                gap: spacing.xs,
                borderBottomWidth: 1,
                borderColor: colors.border,
              }}
              accessibilityLabel={`${new Date(point.date).toLocaleDateString(locale)}, ${t('sessionDetails')}`}
            >
              <Text variant="bodyMedium">
                {new Date(point.date).toLocaleDateString(locale, {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </Text>
              <Text variant="caption" color={colors.secondary}>
                {t('setsValue', { count: point.completedSets })} ·{' '}
                {metric?.unit === 'duration'
                  ? formatHold(point.maxDurationSeconds)
                  : metric?.unit === 'kg'
                    ? `${formatKg(mode.loadMode === 'assisted' ? point.minAssistanceKg : point.maxLoadKg, locale)} kg`
                    : `${formatNumber(point.maxReps, locale, 0)} reps`}
              </Text>
            </Pressable>
          ))}
        </>
      )}
    </Screen>
  );
}
