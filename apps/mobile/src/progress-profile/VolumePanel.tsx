import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  progressExerciseDetailSchema,
  progressExercisesSchema,
  type ProgressRange,
} from '@jimo/schemas';
import {
  useProgressQuery,
  useProgressPages,
  progressParams,
} from '../progress/queries';
import { formatNumber, modeKey } from '../progress/helpers';
import { Copy, PaperCard } from './Surface';
import { Action, CacheNote, DataNotice, SectionHeading } from './Controls';
import { StatCard } from './ProgressCards';
import { ink } from './theme';

export function VolumePanel({
  range,
  active,
}: {
  range: ProgressRange;
  active: boolean;
}) {
  const { t, i18n } = useTranslation(['progressProfile', 'progress']),
    [exerciseId, setExerciseId] = useState<string | null>(null),
    [selectedMode, setSelectedMode] = useState<string | null>(null);
  // Same cache/key as the unfiltered exercise list. Strength search never hides Volume data.
  const list = useProgressPages(
    '/progress/exercises',
    progressExercisesSchema,
    { ...progressParams(range), limit: '15' },
    (p) => p.nextCursor,
  );
  const exercises =
    list.data?.pages.flatMap((page) => page.payload.exercises) ?? [];
  const exercise = exercises.find((e) => e.id === exerciseId) ?? exercises[0];
  const query = useProgressQuery(
    `/progress/exercises/${exercise?.id ?? ''}`,
    progressExerciseDetailSchema,
    progressParams(range),
    active && !!exercise,
  );
  const detail = query.data?.payload,
    mode =
      detail?.modes.find((m) => modeKey(m) === selectedMode) ??
      detail?.modes[0];
  if (!exercise)
    return (
      <PaperCard>
        {list.isPending && list.fetchStatus === 'fetching' ? (
          <DataNotice loading />
        ) : list.error ? (
          <DataNotice retry={() => void list.refetch()} />
        ) : (
          <Copy>{t('volumeEmpty')}</Copy>
        )}
      </PaperCard>
    );
  return (
    <View style={{ gap: 10 }}>
      {list.data?.pages.map((page, index) => (
        <CacheNote key={index} stale={page.stale} fetchedAt={page.fetchedAt} />
      ))}
      <SectionHeading>{t('volumeByExercise')}</SectionHeading>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
      >
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel={t('progress:exercises')}
          style={{ flexDirection: 'row', gap: 8 }}
        >
          {exercises.map((e) => (
            <Pressable
              key={e.id}
              accessibilityRole="radio"
              accessibilityState={{ checked: e.id === exercise.id }}
              aria-checked={e.id === exercise.id}
              onPress={() => setExerciseId(e.id)}
              style={{
                minHeight: 48,
                justifyContent: 'center',
                paddingHorizontal: 12,
                borderWidth: e.id === exercise.id ? 2 : 1,
                borderColor: e.id === exercise.id ? ink.green : ink.border,
                borderRadius: 8,
                backgroundColor: ink.card,
              }}
            >
              <Copy>{e.displayName}</Copy>
            </Pressable>
          ))}
        </View>
      </ScrollView>
      {list.hasNextPage ? (
        <Action
          label={t('progress:moreExercises')}
          disabled={list.isFetching}
          onPress={() => void list.fetchNextPage()}
        />
      ) : null}
      {!detail ? (
        <PaperCard>
          <DataNotice
            loading={query.isPending && query.fetchStatus === 'fetching'}
            retry={() => void query.refetch()}
          />
        </PaperCard>
      ) : !mode ? (
        <PaperCard>
          <Copy>{t('progress:noExercisePeriod')}</Copy>
        </PaperCard>
      ) : (
        <>
          {detail.modes.length > 1 ? (
            <View
              accessibilityRole="radiogroup"
              accessibilityLabel={t('progress:mode')}
              style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}
            >
              {detail.modes.map((m) => (
                <Pressable
                  key={modeKey(m)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: modeKey(m) === modeKey(mode) }}
                  aria-checked={modeKey(m) === modeKey(mode)}
                  onPress={() => setSelectedMode(modeKey(m))}
                  style={{
                    minHeight: 48,
                    justifyContent: 'center',
                    paddingHorizontal: 12,
                    borderBottomWidth: modeKey(m) === modeKey(mode) ? 2 : 1,
                    borderColor: ink.green,
                  }}
                >
                  <Copy>
                    {t(`progress:modes.${m.loadMode}`)} ·{' '}
                    {t(`progress:${m.trackingMode}`)}
                  </Copy>
                </Pressable>
              ))}
            </View>
          ) : null}
          <StatCard
            label={exercise.displayName}
            value={
              mode.loadVolume === null
                ? '—'
                : `${formatNumber(Number(mode.loadVolume), i18n.language, 2)} kg·reps`
            }
            caption={
              mode.loadVolume === null
                ? t('volumeUnavailableMode')
                : t(
                    mode.loadMode === 'weighted'
                      ? 'progress:weightedVolume'
                      : 'progress:externalVolume',
                  )
            }
            {...(mode.loadVolume !== null
              ? {
                  points: mode.timeline.map((p) => ({
                    label: new Date(p.date).toLocaleDateString(i18n.language, {
                      day: 'numeric',
                      month: 'short',
                    }),
                    value: p.loadVolume === null ? null : Number(p.loadVolume),
                  })),
                  format: (value: number) =>
                    `${formatNumber(value, i18n.language, 2)} kg·reps`,
                }
              : {})}
          />
          {mode.loadVolume === null ? (
            <StatCard
              label={t('progress:sets')}
              value={formatNumber(mode.completedSets, i18n.language, 0)}
              caption={t('progress:repsValue', {
                value: formatNumber(mode.totalReps, i18n.language, 0),
              })}
            />
          ) : null}
          {mode.timelineTruncated ? (
            <Copy>{t('progress:timelineLimit')}</Copy>
          ) : null}
          <CacheNote
            stale={query.data?.stale ?? false}
            {...(query.data ? { fetchedAt: query.data.fetchedAt } : {})}
          />
        </>
      )}
    </View>
  );
}
