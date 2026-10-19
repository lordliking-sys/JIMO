import { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import ChevronDown from 'lucide-react-native/icons/chevron-down';
import Check from 'lucide-react-native/icons/check';
import { Text, animePink } from '@jimo/ui';
import {
  progressExerciseDetailSchema,
  progressExercisesSchema,
  type ProgressRange,
} from '@jimo/schemas';
import {
  useProgressPages,
  useProgressQuery,
  progressParams,
} from '../progress/queries';
import { modeKey } from '../progress/helpers';
import { JimoDialog, PopupButton } from '../components/JimoDialog';
import { useOffline } from '../db/Provider';
import { PaperCard, Copy } from './Surface';
import { SectionHeading, CacheNote, DataNotice, Action } from './Controls';
import { PersonalRecordRow } from './ProgressCards';
import { PerformanceChart } from './PerformanceChart';

export function PersonalRecordsPanel({
  range,
  active,
}: {
  range: ProgressRange;
  active: boolean;
}) {
  const { t } = useTranslation(['progressProfile', 'progress']),
    { runtime } = useOffline();
  const [selection, setSelection] = useState<{
      owner: string | null;
      id: string;
      displayName: string;
    } | null>(null),
    [selectedMode, setSelectedMode] = useState<string | null>(null),
    [choosing, setChoosing] = useState(false);
  const list = useProgressPages(
    '/progress/exercises',
    progressExercisesSchema,
    { ...progressParams(range), limit: '15' },
    (page) => page.nextCursor,
  );
  const exercises =
      list.data?.pages.flatMap((page) => page.payload.exercises) ?? [],
    exercise = selection?.owner === runtime.owner ? selection : exercises[0];
  const detail = useProgressQuery(
    `/progress/exercises/${exercise?.id ?? ''}`,
    progressExerciseDetailSchema,
    progressParams(range),
    active && !!exercise,
  );
  const { refetch } = detail;
  const { refetch: refreshList } = list;
  const enabled = active && !!runtime.owner && !!exercise;
  const refreshable = active && !!runtime.owner;
  useFocusEffect(
    useCallback(() => {
      if (refreshable) void refreshList();
      if (enabled) void refetch();
    }, [enabled, refreshable, refetch, refreshList]),
  );
  const payload = detail.data?.payload,
    mode =
      payload?.modes.find((m) => modeKey(m) === selectedMode) ??
      payload?.modes[0];
  return (
    <PaperCard testID="personal-records-panel" style={{ gap: 16 }}>
      <SectionHeading>{t('personalRecords')}</SectionHeading>
      {exercise ? (
        <>
          <Pressable
            testID="record-exercise-picker"
            accessibilityRole="button"
            accessibilityLabel={t('chooseExercise')}
            accessibilityState={{ expanded: choosing }}
            onPress={() => setChoosing(true)}
            style={{
              minHeight: 54,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              paddingHorizontal: 14,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: animePink.border,
              backgroundColor: animePink.surfaceSoft,
            }}
          >
            <Text variant="bodyMedium" style={{ flex: 1, minWidth: 0 }}>
              {exercise.displayName}
            </Text>
            <ChevronDown
              size={20}
              color={animePink.primaryText}
              accessible={false}
            />
          </Pressable>
          {!payload ? (
            <DataNotice
              loading={detail.isPending && detail.fetchStatus === 'fetching'}
              retry={() => void detail.refetch()}
            />
          ) : !mode ? (
            <Copy>{t('progress:noExercisePeriod')}</Copy>
          ) : (
            <>
              <View
                accessibilityRole="radiogroup"
                accessibilityLabel={t('progress:mode')}
                style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}
              >
                {payload.modes.map((m) => (
                  <Pressable
                    key={modeKey(m)}
                    accessibilityRole="radio"
                    accessibilityLabel={`${t(`progress:modes.${m.loadMode}`)} · ${t(`progress:${m.trackingMode}`)}`}
                    accessibilityState={{
                      checked: modeKey(m) === modeKey(mode),
                    }}
                    aria-checked={modeKey(m) === modeKey(mode)}
                    onPress={() => setSelectedMode(modeKey(m))}
                    style={{
                      minHeight: 48,
                      justifyContent: 'center',
                      paddingHorizontal: 12,
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor:
                        modeKey(m) === modeKey(mode)
                          ? animePink.primaryText
                          : animePink.border,
                      backgroundColor:
                        modeKey(m) === modeKey(mode)
                          ? animePink.primaryPinkPale
                          : animePink.surface,
                    }}
                  >
                    <Copy>
                      {t(`progress:modes.${m.loadMode}`)} ·{' '}
                      {t(`progress:${m.trackingMode}`)}
                    </Copy>
                  </Pressable>
                ))}
              </View>
              <PerformanceChart
                key={`${exercise.id}:${modeKey(mode)}:${range}`}
                mode={mode}
                name={exercise.displayName}
              />
              {mode.timelineTruncated ? (
                <Copy>{t('progress:timelineLimit')}</Copy>
              ) : null}
              {mode.records.map((record) => (
                <PersonalRecordRow
                  key={`${record.type}:${record.loadMode}:${record.trackingMode}`}
                  record={record}
                  latest={mode.latest}
                />
              ))}
              {!mode.records.length ? (
                <Copy>{t('progress:noRecords')}</Copy>
              ) : null}
              <CacheNote
                stale={detail.data?.stale ?? false}
                {...(detail.data ? { fetchedAt: detail.data.fetchedAt } : {})}
              />
            </>
          )}
        </>
      ) : list.isPending && list.fetchStatus === 'fetching' ? (
        <DataNotice loading />
      ) : list.error ? (
        <DataNotice retry={() => void list.refetch()} />
      ) : (
        <Copy>{t('progress:noExercises')}</Copy>
      )}
      {list.data?.pages.map((page, i) => (
        <CacheNote key={i} stale={page.stale} fetchedAt={page.fetchedAt} />
      ))}
      <JimoDialog
        title={t('chooseExercise')}
        visible={choosing}
        close={() => setChoosing(false)}
        onDismiss={() => {}}
        footer={
          <PopupButton
            label={t('progress:back')}
            outline
            onPress={() => setChoosing(false)}
          />
        }
      >
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel={t('progress:exercises')}
          style={{ gap: 6 }}
        >
          {exercises.map((item) => (
            <Pressable
              key={item.id}
              accessibilityRole="radio"
              accessibilityLabel={item.displayName}
              accessibilityState={{ checked: item.id === exercise?.id }}
              aria-checked={item.id === exercise?.id}
              onPress={() => {
                setSelection({
                  owner: runtime.owner,
                  id: item.id,
                  displayName: item.displayName,
                });
                setSelectedMode(null);
                setChoosing(false);
              }}
              style={{
                minHeight: 52,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                padding: 12,
                borderRadius: 16,
                backgroundColor:
                  item.id === exercise?.id
                    ? animePink.surfaceSoft
                    : animePink.surface,
              }}
            >
              <Text style={{ flex: 1, minWidth: 0 }}>{item.displayName}</Text>
              {item.id === exercise?.id ? (
                <Check
                  size={20}
                  color={animePink.primaryText}
                  accessible={false}
                />
              ) : null}
            </Pressable>
          ))}
        </View>
        {list.hasNextPage ? (
          <Action
            label={t('progress:moreExercises')}
            disabled={list.isFetching}
            onPress={() => void list.fetchNextPage()}
          />
        ) : null}
      </JimoDialog>
    </PaperCard>
  );
}
