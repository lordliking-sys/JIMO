import { Pressable, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import ArrowRight from 'lucide-react-native/icons/arrow-right';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import Dumbbell from 'lucide-react-native/icons/dumbbell';
import Flame from 'lucide-react-native/icons/flame';
import ChartNoAxesColumnIncreasing from 'lucide-react-native/icons/chart-no-axes-column-increasing';
import { Text } from '@jimo/ui';
import { progressSummarySchema, zonedDateKey } from '@jimo/schemas';
import { useAccount } from '../auth/AccountProvider';
import { SyncStatus } from '../db/Status';
import { useGreeting } from '../home/useGreeting';
import { useHistory } from '../workouts/queries';
import { setSummary, weekBounds, weekSchedule } from '../workouts/helpers';
import { useProgressQuery, progressParams } from '../progress/queries';
import { exerciseSummary } from '../programs/summary';
import { MainNotice, MainScreen, MainText } from './Surface';
import { mainInk } from './theme';
import { completedDay, completedExerciseCount, homeDay } from './helpers';
import { useTraining } from './useTraining';
import { useDayStart } from './useDayStart';
import { WeekStrip } from './WeekStrip';
import { HomeHero } from './HomeHero';

export function MainHome() {
  const { t, i18n } = useTranslation([
      'main',
      'common',
      'programs',
      'workouts',
      'navigation',
    ]),
    router = useRouter(),
    greeting = useGreeting();
  const { profile } = useAccount(),
    { width } = useWindowDimensions();
  const { program: query, session, runtime, refresh, now } = useTraining(),
    program = query.data,
    active = session.data?.workout;
  const { start, end } = weekBounds(now),
    history = useHistory(start.toISOString(), end.toISOString(), 'completed');
  const progress = useProgressQuery(
    '/progress/summary',
    progressSummarySchema,
    progressParams('4w'),
  );
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const completedIds = new Set(
    (program?.days ?? [])
      .filter((day) =>
        completedDay(
          day,
          program!.id,
          history.data?.workouts ?? [],
          start,
          timeZone,
        ),
      )
      .map((day) => day.id),
  );
  const { day, scheduledToday } = homeDay(program, now, completedIds),
    action = useDayStart(day?.id);
  const week = weekSchedule(
    program?.days ?? [],
    history.data?.workouts ?? [],
    program?.id ?? '',
    now,
  ).map((item) => ({
    ...item,
    completed: (history.data?.workouts ?? []).some(
      (workout) =>
        workout.status === 'completed' &&
        workout.completedAt &&
        zonedDateKey(workout.completedAt, timeZone) ===
          zonedDateKey(item.date, timeZone),
    ),
  }));
  const name = profile?.displayName?.trim().split(/\s+/)[0];
  const canStart =
    !!program &&
    !!day?.exercises.length &&
    scheduledToday &&
    !completedIds.has(day.id);
  const label =
    active || action.conflict
      ? t('workouts:resume')
      : !program
        ? t('common:home.create')
        : canStart
          ? t('workouts:start')
          : t('workouts:choose');
  const openProgram = () => router.push('/program');
  const open = () => {
    if (active)
      router.push({ pathname: '/workout/[id]', params: { id: active.id } });
    else if (action.conflict || canStart) action.start();
    else if (!program) router.push('/program/manual');
    else openProgram();
  };
  const upcoming = active
    ? active.exercises.find((exercise) =>
        exercise.sets.some((set) => set.status === 'pending'),
      )
    : day?.exercises[0];
  const prescription =
    !active && day?.exercises[0]
      ? exerciseSummary(
          day.exercises[0],
          i18n.resolvedLanguage ?? 'en',
          i18n.getFixedT(null, 'programs'),
        )
      : null;
  const dataUnavailable =
    !active && !program && (!runtime.online || !runtime.owner);
  const nextSet =
    upcoming && 'sets' in upcoming
      ? upcoming.sets.find((set) => set.status === 'pending')
      : null;
  const snapshot =
    nextSet && upcoming && 'sets' in upcoming
      ? setSummary(upcoming, nextSet, i18n.resolvedLanguage ?? 'en')
      : null;
  const activePrescription =
    snapshot && upcoming && 'sets' in upcoming
      ? {
          target: `${upcoming.sets.length} × ${snapshot.target}`,
          load:
            upcoming.loadModeSnapshot === 'bodyweight'
              ? t('workouts:bodyweight')
              : upcoming.loadModeSnapshot === 'assisted'
                ? `${t('workouts:assisted')} ${snapshot.load || '—'} kg`
                : `${upcoming.loadModeSnapshot === 'weighted' ? '+' : ''}${snapshot.load || '—'} kg`,
        }
      : null;
  const upcomingPrescription = prescription ?? activePrescription;
  return (
    <MainScreen light>
      <HomeHero name={name} greeting={greeting} />
      {query.isPending || session.isPending ? (
        <MainNotice loading />
      ) : !program && (query.error || session.error) ? (
        <MainNotice retry={refresh} />
      ) : (
        <>
          <Pressable
            testID="home-workout-card"
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{ disabled: action.pending || dataUnavailable }}
            disabled={action.pending || dataUnavailable}
            onPress={open}
            style={({ pressed }) => ({
              flexDirection: 'row',
              gap: 14,
              alignItems: 'center',
              padding: 16,
              marginTop: 8,
              minHeight: 104,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: mainInk.paperBorder,
              backgroundColor: '#f8f0dd',
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <View style={{ flex: 1, gap: 4 }}>
              <MainText style={{ fontSize: 18 }}>
                {active ? t('workouts:resume') : t('todayWorkout')}
              </MainText>
              <MainText
                style={{ fontSize: width < 360 ? 29 : 34, lineHeight: 36 }}
              >
                {active?.name ??
                  (dataUnavailable
                    ? t('workouts:offline.connect')
                    : program
                      ? scheduledToday
                        ? program.name
                        : t('workouts:restDay')
                      : t('common:home.empty'))}
              </MainText>
              {active ? (
                <MainText style={{ fontSize: 18 }}>
                  {t('exerciseProgress', {
                    completed: completedExerciseCount(active),
                    total: active.exercises.length,
                  })}
                </MainText>
              ) : program && day ? (
                <MainText style={{ fontSize: 17 }}>
                  {scheduledToday
                    ? `${day.name} · ${t('programs:exerciseCount', { count: day.exercises.length })}`
                    : program.name}
                </MainText>
              ) : (
                <Text variant="caption" color={mainInk.darkMuted}>
                  {dataUnavailable
                    ? t('offline')
                    : t('common:home.description')}
                </Text>
              )}
              {!program && !dataUnavailable ? (
                <Text variant="caption" color={mainInk.green}>
                  {t('common:home.create')}
                </Text>
              ) : program && !scheduledToday && !active ? (
                <Text variant="caption" color={mainInk.green}>
                  {t(
                    program.days.some((day) => day.dayOfWeek !== null)
                      ? 'chooseDay'
                      : 'unscheduled',
                  )}
                </Text>
              ) : null}
            </View>
            {!dataUnavailable ? (
              <View
                accessible={false}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: mainInk.green,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ArrowRight
                  size={29}
                  color={mainInk.parchment}
                  strokeWidth={1.8}
                />
              </View>
            ) : null}
          </Pressable>
          {action.error ? (
            <Text
              accessibilityRole="alert"
              variant="caption"
              color={mainInk.darkMuted}
              style={{ marginTop: 8 }}
            >
              {action.conflict
                ? t('workouts:startConflict')
                : t('programs:serverError')}
            </Text>
          ) : null}
        </>
      )}
      <View style={{ backgroundColor: mainInk.charcoal, borderRadius: 12 }}>
        <SyncStatus />
      </View>
      <WeekStrip week={week} />
      {history.error ? (
        <MainNotice retry={() => void history.refetch()} />
      ) : null}
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
        <View
          testID="home-streak"
          style={{
            flex: 1,
            minWidth: 0,
            minHeight: 84,
            padding: 10,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: mainInk.paperBorder,
            backgroundColor: 'rgba(240, 228, 204, 0.76)',
            gap: 4,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Flame size={18} color="#a56d37" strokeWidth={1.6} />
            <MainText style={{ fontSize: 19 }}>{t('streak')}</MainText>
          </View>
          <MainText style={{ fontSize: 25, lineHeight: 27 }}>—</MainText>
          <Text
            variant="caption"
            color={mainInk.darkMuted}
            style={{ fontSize: 12 }}
          >
            {t('unavailable')}
          </Text>
        </View>
        <Pressable
          testID="home-progress"
          accessibilityRole="button"
          accessibilityLabel={t('navigation:progress')}
          onPress={() => router.push('/progress')}
          style={({ pressed }) => ({
            flex: 1,
            minWidth: 0,
            minHeight: 84,
            padding: 10,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: mainInk.paperBorder,
            backgroundColor: 'rgba(240, 228, 204, 0.76)',
            gap: 4,
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <ChartNoAxesColumnIncreasing
              size={18}
              color={mainInk.green}
              strokeWidth={2}
            />
            <MainText style={{ fontSize: 19 }}>
              {t('navigation:progress')}
            </MainText>
          </View>
          <MainText style={{ fontSize: 25, lineHeight: 27 }}>
            {progress.data?.payload.completedWorkouts ?? '—'}
          </MainText>
          <Text
            variant="caption"
            color={mainInk.darkMuted}
            style={{ fontSize: 12 }}
          >
            {t(
              progress.data
                ? progress.data.stale
                  ? 'cachedSessions'
                  : 'sessions4w'
                : 'unavailable',
            )}
          </Text>
        </Pressable>
      </View>
      <MainText
        accessibilityRole="header"
        style={{ fontSize: 23, marginTop: 16, marginBottom: 8 }}
      >
        {t('nextExercises')}
      </MainText>
      {upcoming ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('nextExerciseAction', {
            name:
              'exerciseNameSnapshot' in upcoming
                ? upcoming.exerciseNameSnapshot
                : upcoming.exercise.displayName,
          })}
          disabled={action.pending || dataUnavailable}
          onPress={open}
          style={({ pressed }) => ({
            flexDirection: 'row',
            gap: 12,
            alignItems: 'center',
            minHeight: 76,
            padding: 12,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: mainInk.paperBorder,
            backgroundColor: 'rgba(240, 228, 204, 0.80)',
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <View
            accessible={false}
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: mainInk.sage,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MainText style={{ fontSize: 22 }}>
              {active
                ? active.exercises.indexOf(
                    upcoming as (typeof active.exercises)[number],
                  ) + 1
                : 1}
            </MainText>
          </View>
          <Dumbbell
            accessible={false}
            size={30}
            strokeWidth={1.4}
            color={mainInk.green}
          />
          <View style={{ flex: 1 }}>
            <MainText style={{ fontSize: 24 }}>
              {'exerciseNameSnapshot' in upcoming
                ? upcoming.exerciseNameSnapshot
                : upcoming.exercise.displayName}
            </MainText>
            {upcomingPrescription ? (
              <MainText style={{ fontSize: 18 }}>
                {upcomingPrescription.target} {upcomingPrescription.load}
              </MainText>
            ) : (
              <Text variant="caption" color={mainInk.darkMuted}>
                {t('workouts:resume')}
              </Text>
            )}
          </View>
          <ChevronRight accessible={false} size={24} color={mainInk.green} />
        </Pressable>
      ) : (
        <Text variant="caption" color={mainInk.darkMuted}>
          {t('noUpcoming')}
        </Text>
      )}
    </MainScreen>
  );
}
