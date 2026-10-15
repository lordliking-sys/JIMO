import { useState, useRef } from 'react';
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
import {
  setSummary,
  weekBounds,
  weekSchedule,
  localWeekday,
} from '../workouts/helpers';
import { exerciseSummary } from '../programs/summary';
import { MainNotice, MainScreen, MainText } from './Surface';
import { completedExerciseCount, homePlanForDate } from './helpers';
import { useTraining } from './useTraining';
import { useDayStart } from './useDayStart';
import { WeekStrip } from './WeekStrip';
import { ExerciseThumbnail } from '../programs/ExerciseThumbnail';
import { HomeHero } from './HomeHero';
import { SectionBody } from '../components/SectionBody';
import { parseCalendarDate } from '../programs/date';

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
  const todayKey = zonedDateKey(now, timeZone),
    weekKey = zonedDateKey(start, timeZone);
  const [selection, setSelection] = useState<{
    week: string;
    date: string;
  } | null>(null);
  const selectedKey = selection?.week === weekKey ? selection.date : todayKey;
  const selectedDate = parseCalendarDate(selectedKey) ?? now;
  const plan = homePlanForDate(
    program,
    selectedDate,
    history.data?.workouts ?? [],
    timeZone,
  );
  const day = plan.day,
    scheduledToday = !!day;
  const action = useDayStart(day?.id);
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
    !!program && !!day?.exercises.length && scheduledToday && !plan.completed;
  const label =
    active || action.conflict
      ? t('workouts:resume')
      : !program
        ? t('goToProgram')
        : canStart
          ? t('workouts:start')
          : t('editDayAction');
  const editRequest = useRef(0);
  const openProgram = () => router.push('/program');
  const editSelected = () =>
    router.push({
      pathname: '/program',
      params: {
        weekday: String(localWeekday(selectedDate)),
        openDay: `${Date.now()}-${++editRequest.current}`,
      },
    });
  const open = () => {
    if (active)
      router.push({ pathname: '/workout/[id]', params: { id: active.id } });
    else if (action.conflict || canStart) action.start();
    else if (!program) openProgram();
    else editSelected();
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
        <WeekStrip
          week={week}
          selectedDate={selectedDate}
          onSelect={(date) =>
            setSelection({ week: weekKey, date: zonedDateKey(date, timeZone) })
          }
        />
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
            style={{ fontSize: 22, lineHeight: 28, flex: 1, minWidth: 0 }}
          >
            {selectedKey === todayKey
              ? t('todayPlan')
              : t('selectedPlan', {
                  date: selectedDate.toLocaleDateString(
                    i18n.resolvedLanguage ?? 'it',
                    { weekday: 'long', day: 'numeric', month: 'short' },
                  ),
                })}
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
                        ? day!.name
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
                      ? t('programs:exerciseCount', {
                          count: day!.exercises.length,
                        })
                      : program.name
                    : dataUnavailable
                      ? t('offline')
                      : t('common:home.description')}
              </Text>
              {!active &&
              program &&
              (!scheduledToday || !day!.exercises.length || plan.completed) ? (
                <Text variant="caption" color={animePink.textSecondary}>
                  {plan.completed
                    ? t('workouts:workoutStatus.completed')
                    : scheduledToday
                      ? t('emptyDay')
                      : t('noScheduledWorkout')}
                </Text>
              ) : null}
              {!dataUnavailable ? (
                <Text variant="caption" color={animePink.primaryText}>
                  {label}
                </Text>
              ) : null}
            </View>
            {!dataUnavailable && (active || action.conflict || canStart) ? (
              <View
                testID="home-start-affordance"
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
