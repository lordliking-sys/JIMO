import { useState } from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text } from '@jimo/ui';
import { usePrograms, useProgram } from '../api/queries';
import { useHistory } from '../workouts/queries';
import { statusKey } from '../programs/helpers';
import { PendingReview } from '../imports/PendingReview';
import { useImportFeature } from '../features/useImportFeature';
import { MainButton, MainNotice, MainScreen, MainText } from './Surface';
import { mainInk } from './theme';
import { programWeek, selectedWeekBounds, dayStates } from './helpers';
import { useTraining } from './useTraining';
import { DayCard } from './DayCard';
import { WeekOverview } from './WeekOverview';

export function MainProgram() {
  const { t } = useTranslation(['main', 'programs', 'common']),
    router = useRouter(),
    { width } = useWindowDimensions();
  const list = usePrograms(),
    { program: cached, session, now, runtime } = useTraining(),
    importEnabled = useImportFeature();
  const summary =
    list.data?.programs.find((p) => p.status === 'active') ??
    list.data?.programs.find((p) => p.status === 'draft') ??
    list.data?.programs[0];
  const cachedMatches =
    cached.data && (!summary || cached.data.id === summary.id);
  const detail = useProgram(cachedMatches ? '' : (summary?.id ?? '')),
    program = cachedMatches ? cached.data : detail.data;
  const weeks = programWeek(program, now),
    [selection, setSelection] = useState<{
      programId: string;
      week: number;
    } | null>(null);
  const selected =
    selection && selection.programId === program?.id
      ? Math.min(weeks.total, selection.week)
      : weeks.current;
  const bounds = selectedWeekBounds(program, selected, now),
    history = useHistory(
      bounds.start.toISOString(),
      bounds.end.toISOString(),
      'completed',
    );
  const currentWeek =
    now >= bounds.start && now < bounds.end && program?.status === 'active';
  const states = program
    ? dayStates(
        program,
        history.data?.workouts ?? [],
        session.data?.workout,
        bounds.start,
        currentWeek,
        now,
      )
    : new Map();
  const firstWeek = Math.max(1, Math.min(selected - 1, weeks.total - 2)),
    visibleWeeks = Array.from(
      { length: Math.min(3, weeks.total) },
      (_, index) => firstWeek + index,
    );
  const pending =
    !program &&
    (cached.isPending || list.isPending || (!!summary && detail.isPending));
  const failed = !program && (list.error || detail.error || cached.error);
  const retry = () => {
    void list.refetch();
    if (summary && !cachedMatches) void detail.refetch();
    void runtime.engine.request(true);
  };
  return (
    <MainScreen>
      <View
        style={{
          paddingTop: width < 360 ? 64 : 76,
          paddingBottom: 16,
          paddingHorizontal: 12,
        }}
      >
        <MainText
          accessibilityRole="header"
          style={{
            fontSize: width < 360 ? 38 : 44,
            lineHeight: 48,
            letterSpacing: 0.5,
          }}
        >
          {t('title')}
        </MainText>
        {program ? (
          <MainText style={{ fontSize: 29, lineHeight: 33 }}>
            {program.name}
          </MainText>
        ) : (
          <MainText style={{ fontSize: 23 }}>{t('programs:subtitle')}</MainText>
        )}
      </View>
      <PendingReview />
      {pending ? (
        <MainNotice loading />
      ) : failed ? (
        <MainNotice retry={retry} />
      ) : !program ? (
        <View
          style={{
            backgroundColor: mainInk.darkSurface,
            borderColor: mainInk.border,
            borderWidth: 1,
            borderRadius: 20,
            padding: 20,
            gap: 14,
          }}
        >
          <MainText style={{ fontSize: 28 }}>{t('programs:empty')}</MainText>
          <Text variant="caption" color={mainInk.muted}>
            {t('programs:emptyDescription')}
          </Text>
          <MainButton
            label={t('programs:create')}
            onPress={() => router.push('/program/manual')}
          />
          <Text variant="caption" color={mainInk.muted}>
            {t('programs:aiSoon')}
          </Text>
          {importEnabled ? (
            <MainButton
              subtle
              label={t('programs:import')}
              onPress={() => router.push('/import')}
            />
          ) : (
            <Text variant="caption" color={mainInk.muted}>
              {t('programs:importSoon')}
            </Text>
          )}
        </View>
      ) : (
        <>
          {program.status !== 'active' ? (
            <Text
              variant="caption"
              color={mainInk.sage}
              style={{ marginBottom: 10 }}
            >
              {t(`programs:${statusKey(program.status)}`)}
            </Text>
          ) : null}
          <View
            testID="program-week-selector"
            accessibilityRole="radiogroup"
            accessibilityLabel={t('week')}
            style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}
          >
            {weeks.anchored ? (
              visibleWeeks.map((week) => (
                <Pressable
                  key={week}
                  accessibilityRole="radio"
                  accessibilityLabel={t('weekNumber', { number: week })}
                  accessibilityState={{ checked: selected === week }}
                  aria-checked={selected === week}
                  onPress={() => setSelection({ programId: program.id, week })}
                  style={({ pressed }) => ({
                    flex: 1,
                    minWidth: 0,
                    minHeight: 48,
                    paddingHorizontal: 4,
                    paddingVertical: 8,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor:
                      selected === week ? mainInk.sage : mainInk.border,
                    backgroundColor:
                      selected === week ? mainInk.sage : mainInk.darkSurface,
                    justifyContent: 'center',
                    alignItems: 'center',
                    opacity: pressed ? 0.8 : 1,
                  })}
                >
                  <MainText
                    style={{
                      fontSize: width < 360 ? 17 : 19,
                      textAlign: 'center',
                      color:
                        selected === week
                          ? mainInk.charcoal
                          : mainInk.parchment,
                    }}
                  >
                    {t('weekNumber', { number: week })}
                  </MainText>
                </Pressable>
              ))
            ) : (
              <View
                style={{
                  minHeight: 48,
                  padding: 12,
                  borderRadius: 14,
                  backgroundColor: mainInk.darkSurface,
                  justifyContent: 'center',
                }}
              >
                <MainText style={{ fontSize: 20 }}>{t('currentWeek')}</MainText>
              </View>
            )}
          </View>
          {history.error ? (
            <MainNotice retry={() => void history.refetch()} />
          ) : null}
          <View style={{ gap: 8 }}>
            {program.days.map((day, index) => (
              <DayCard
                key={day.id}
                program={program}
                day={day}
                index={index}
                state={states.get(day.id) ?? 'future'}
                completed={
                  states.get(day.id) === 'completed'
                    ? history.data?.workouts.find(
                        (workout) =>
                          workout.status === 'completed' &&
                          workout.programId === program.id &&
                          workout.programDayId === day.id,
                      )
                    : undefined
                }
              />
            ))}
            {!program.days.length ? (
              <View
                style={{
                  padding: 18,
                  backgroundColor: mainInk.darkSurface,
                  borderRadius: 14,
                  gap: 8,
                }}
              >
                <MainText>{t('programs:noDays')}</MainText>
                <Text variant="caption" color={mainInk.muted}>
                  {t('programs:noDaysHint')}
                </Text>
              </View>
            ) : null}
          </View>
          {program.days.length ? (
            <WeekOverview days={program.days} states={states} />
          ) : null}
          <MainButton
            subtle
            label={`${t('programs:open')} ${program.name}`}
            onPress={() =>
              router.push({
                pathname: '/program/[id]',
                params: { id: program.id },
              })
            }
          />
          <View style={{ gap: 12, marginTop: 14 }}>
            {(list.data?.programs ?? [])
              .filter((p) => p.id !== program.id)
              .map((p) => (
                <View
                  key={p.id}
                  style={{
                    padding: 14,
                    backgroundColor: mainInk.darkSurface,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: mainInk.border,
                    gap: 6,
                  }}
                >
                  <Text variant="caption" color={mainInk.muted}>
                    {t(`programs:${statusKey(p.status)}`)} ·{' '}
                    {t('programs:dayCount', { count: p.daysCount })}
                  </Text>
                  <MainText style={{ fontSize: 25 }}>{p.name}</MainText>
                  <MainButton
                    subtle
                    label={`${t('programs:open')} ${p.name}`}
                    onPress={() =>
                      router.push({
                        pathname: '/program/[id]',
                        params: { id: p.id },
                      })
                    }
                  />
                </View>
              ))}
            <MainButton
              subtle
              label={t('programs:newProgram')}
              onPress={() => router.push('/program/create')}
            />
          </View>
        </>
      )}
    </MainScreen>
  );
}
