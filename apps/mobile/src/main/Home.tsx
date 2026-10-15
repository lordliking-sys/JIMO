import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Play from 'lucide-react-native/icons/play';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import Dumbbell from 'lucide-react-native/icons/dumbbell';
import { Text, animePink } from '@jimo/ui';
import { zonedDateKey } from '@jimo/schemas';
import { SyncStatus } from '../db/Status';
import { useHistory } from '../workouts/queries';
import { setSummary, weekBounds, weekSchedule } from '../workouts/helpers';
import { exerciseSummary } from '../programs/summary';
import { MainNotice, MainScreen, MainText } from './Surface';
import { completedDay, completedExerciseCount, homeDay } from './helpers';
import { useTraining } from './useTraining';
import { useDayStart } from './useDayStart';
import { WeekStrip } from './WeekStrip';
import { ExerciseThumbnail } from '../programs/ExerciseThumbnail';
import { HomeHero } from './HomeHero';
import { SectionBody } from '../components/SectionBody';

export function MainHome() {
  const { t, i18n } = useTranslation([
      'main',
      'common',
      'programs',
      'workouts',
      'navigation',
    ]),
    router = useRouter();
  const { program: query, session, runtime, refresh, now } = useTraining(),
    program = query.data,
    active =
      session.data?.workout?.status === 'in_progress'
        ? session.data.workout
        : null;
  const { start, end } = weekBounds(now),
    history = useHistory(start.toISOString(), end.toISOString(), 'completed');
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
    : scheduledToday
      ? day?.exercises[0]
      : null;
  const dataUnavailable =
    !active && !program && (!runtime.online || !runtime.owner);
  const exercises = active
    ? upcoming
      ? [upcoming]
      : []
    : scheduledToday
      ? (day?.exercises ?? [])
      : [];
  const thumb = upcoming
    ? 'exercise' in upcoming
      ? upcoming.exercise
      : { canonicalName: upcoming.exerciseNameSnapshot, isCustom: false }
    : null;
  return (
    <MainScreen light>
      <HomeHero />
      <SectionBody
        testID="home-body"
        style={{
          paddingTop: 12,
          gap: 16,
        }}
      >
        <WeekStrip week={week} />
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          <MainText
            accessibilityRole="header"
            style={{ fontSize: 22, lineHeight: 28 }}
          >
            {t('todayPlan')}
          </MainText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('seeAll')}
            onPress={openProgram}
            style={{
              minHeight: 48,
              flexDirection: 'row',
              gap: 4,
              alignItems: 'center',
            }}
          >
            <Text variant="caption" color={animePink.primaryText}>
              {t('seeAll')}
            </Text>
            <ChevronRight size={18} color={animePink.primaryPink} />
          </Pressable>
        </View>
        {(!active && query.isPending) || session.isPending ? (
          <MainNotice loading />
        ) : !active && !program && (query.error || session.error) ? (
          <MainNotice retry={refresh} />
        ) : (
          <Pressable
            testID="home-workout-card"
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{ disabled: action.pending || dataUnavailable }}
            disabled={action.pending || dataUnavailable}
            onPress={open}
            style={({ pressed }) => ({
              flexDirection: 'row',
              gap: 12,
              alignItems: 'center',
              padding: 12,
              minHeight: 90,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: animePink.border,
              backgroundColor: animePink.surface,
              opacity: pressed ? 0.8 : 1,
            })}
          >
            {thumb ? (
              <ExerciseThumbnail exercise={thumb} tone="light" />
            ) : (
              <View
                style={{
                  width: 68,
                  height: 60,
                  borderRadius: 14,
                  backgroundColor: animePink.surfaceSoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Dumbbell size={28} color={animePink.primaryPink} />
              </View>
            )}
            <View style={{ flex: 1, minWidth: 0, gap: 5 }}>
              <MainText style={{ fontSize: 16, lineHeight: 21 }}>
                {active?.name ??
                  (dataUnavailable
                    ? t('workouts:offline.connect')
                    : program
                      ? scheduledToday
                        ? program.name
                        : t('restDay')
                      : t('noActivePlan'))}
              </MainText>
              <Text variant="caption" color={animePink.textSecondary}>
                {active
                  ? t('exerciseProgress', {
                      completed: completedExerciseCount(active),
                      total: active.exercises.length,
                    })
                  : program
                    ? scheduledToday
                      ? `${day!.name} · ${t('programs:exerciseCount', { count: day!.exercises.length })}`
                      : program.name
                    : dataUnavailable
                      ? t('offline')
                      : t('common:home.description')}
              </Text>
              {!program && !dataUnavailable ? (
                <Text variant="caption" color={animePink.primaryText}>
                  {t('common:home.create')}
                </Text>
              ) : program && !scheduledToday && !active ? (
                <Text variant="caption" color={animePink.primaryText}>
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
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: animePink.primaryAction,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Play
                  size={18}
                  color={animePink.white}
                  fill={animePink.white}
                />
              </View>
            ) : null}
          </Pressable>
        )}
        <SyncStatus />
        <MainText
          accessibilityRole="header"
          style={{ fontSize: 18, lineHeight: 24 }}
        >
          {t('nextExercises')}
        </MainText>
        {exercises.length ? (
          <View testID="home-upcoming-exercise" style={{ gap: 8 }}>
            {exercises.map((exercise) => {
              const snapshot = 'sets' in exercise ? exercise : null;
              const next = snapshot?.sets.find(
                (set) => set.status === 'pending',
              );
              const brief =
                snapshot && next
                  ? setSummary(snapshot, next, i18n.resolvedLanguage ?? 'en')
                  : null;
              const prescription =
                'exercise' in exercise
                  ? exerciseSummary(
                      exercise,
                      i18n.resolvedLanguage ?? 'en',
                      i18n.getFixedT(null, 'programs'),
                    )
                  : null;
              const load = snapshot
                ? snapshot.loadModeSnapshot === 'bodyweight'
                  ? t('workouts:bodyweight')
                  : snapshot.loadModeSnapshot === 'assisted'
                    ? `${t('workouts:assisted')} ${brief?.load || '—'} kg`
                    : `${snapshot.loadModeSnapshot === 'weighted' ? '+' : ''}${brief?.load || '—'} kg`
                : '';
              const thumbnail =
                'exercise' in exercise
                  ? exercise.exercise
                  : {
                      canonicalName: exercise.exerciseNameSnapshot,
                      isCustom: false,
                    };
              return (
                <Pressable
                  key={exercise.id}
                  accessibilityRole="button"
                  accessibilityLabel={t('nextExerciseAction', {
                    name:
                      'exerciseNameSnapshot' in exercise
                        ? exercise.exerciseNameSnapshot
                        : exercise.exercise.displayName,
                  })}
                  disabled={action.pending || dataUnavailable}
                  onPress={open}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    gap: 12,
                    alignItems: 'center',
                    minHeight: 78,
                    padding: 12,
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: animePink.border,
                    backgroundColor: animePink.surface,
                    opacity: pressed ? 0.8 : 1,
                  })}
                >
                  <ExerciseThumbnail exercise={thumbnail} tone="light" />
                  <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                    <MainText style={{ fontSize: 16, lineHeight: 21 }}>
                      {'exerciseNameSnapshot' in exercise
                        ? exercise.exerciseNameSnapshot
                        : exercise.exercise.displayName}
                    </MainText>
                    <Text variant="caption" color={animePink.textSecondary}>
                      {prescription
                        ? prescription.primary
                        : brief
                          ? `${snapshot!.sets.length} × ${brief.target} ${load}`
                          : t('workouts:resume')}
                    </Text>
                  </View>
                  <ChevronRight size={20} color={animePink.primaryPink} />
                </Pressable>
              );
            })}
          </View>
        ) : (
          <Text variant="caption" color={animePink.textSecondary}>
            {t('noUpcoming')}
          </Text>
        )}
      </SectionBody>
    </MainScreen>
  );
}
