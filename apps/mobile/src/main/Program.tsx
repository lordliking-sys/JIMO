import { useState } from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text } from '@jimo/ui';
import Pencil from 'lucide-react-native/icons/pencil';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
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
import { WeekSelector } from './WeekSelector';

export function MainProgram() {
  const { t } = useTranslation(['main', 'programs', 'common']),
    router = useRouter(),
    { width } = useWindowDimensions();
  const list = usePrograms(),
    { program: cached, session, now, runtime } = useTraining(),
    importEnabled = useImportFeature();
  const summary =
    list.data?.programs.find((p) => p.status === 'active') ??
    list.data?.programs.find((p) => p.status === 'draft');
  const cachedMatches =
    cached.data &&
    cached.data.status !== 'archived' &&
    (!list.data || cached.data.id === summary?.id);
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
  const otherPrograms = (list.data?.programs ?? []).filter(
    (p) => p.id !== program?.id,
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
        {program ? (
          <Pressable
            testID="program-header-action"
            accessibilityRole="button"
            accessibilityLabel={t('programs:managePrograms')}
            onPress={() => router.push('/program/manage')}
            style={({ pressed }) => ({
              position: 'absolute',
              right: 0,
              top: width < 360 ? 64 : 76,
              width: 48,
              height: 48,
              borderRadius: 24,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: mainInk.darkSurface,
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Pencil size={19} color={mainInk.muted} />
          </Pressable>
        ) : null}
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
          {weeks.anchored ? (
            <WeekSelector
              key={program.id}
              total={weeks.total}
              selected={selected}
              onSelect={(week) => setSelection({ programId: program.id, week })}
            />
          ) : (
            <View
              style={{
                minHeight: 48,
                padding: 12,
                borderRadius: 14,
                backgroundColor: mainInk.darkSurface,
                justifyContent: 'center',
                alignSelf: 'flex-start',
                marginBottom: 12,
              }}
            >
              <MainText style={{ fontSize: 20 }}>{t('currentWeek')}</MainText>
            </View>
          )}
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
        </>
      )}
      {otherPrograms.length ? (
        <View
          testID="program-other-programs"
          style={{
            marginTop: 18,
            paddingHorizontal: 12,
            paddingVertical: 8,
            backgroundColor: mainInk.darkSurface,
            borderRadius: 8,
          }}
        >
          <Text
            variant="caption"
            color={mainInk.muted}
            style={{ letterSpacing: 1, marginBottom: 4 }}
          >
            {t('otherPrograms')}
          </Text>
          {otherPrograms.map((p) => (
            <Pressable
              key={p.id}
              testID={`other-program-${p.id}`}
              accessibilityRole="button"
              accessibilityLabel={`${t('programs:open')} ${p.name}, ${t(`programs:${statusKey(p.status)}`)}, ${t('programs:dayCount', { count: p.daysCount })}`}
              onPress={() =>
                router.push({ pathname: '/program/[id]', params: { id: p.id } })
              }
              style={({ pressed }) => ({
                minHeight: 60,
                paddingVertical: 8,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                <MainText style={{ fontSize: 22 }}>{p.name}</MainText>
                <Text variant="caption" color={mainInk.muted}>
                  {t(`programs:${statusKey(p.status)}`)} ·{' '}
                  {t('programs:dayCount', { count: p.daysCount })}
                </Text>
              </View>
              <ChevronRight size={20} color={mainInk.muted} />
            </Pressable>
          ))}
        </View>
      ) : null}
      {program ? (
        <Pressable
          testID="program-new-action"
          accessibilityRole="button"
          accessibilityLabel={t('programs:newProgram')}
          onPress={() => router.push('/program/create')}
          style={({ pressed }) => ({
            minHeight: 48,
            paddingHorizontal: 6,
            paddingVertical: 10,
            borderRadius: 8,
            backgroundColor: mainInk.darkSurface,
            marginTop: 8,
            justifyContent: 'center',
            alignSelf: 'flex-start',
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <MainText style={{ fontSize: 21, color: mainInk.sage }}>
            {t('programs:newProgram')}
          </MainText>
        </Pressable>
      ) : null}
    </MainScreen>
  );
}
