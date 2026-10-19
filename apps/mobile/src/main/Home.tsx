import { useState, useRef } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Play from 'lucide-react-native/icons/play';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import Dumbbell from 'lucide-react-native/icons/dumbbell';
import { Text, animePink, uiDepth } from '@jimo/ui';
import { zonedDateKey } from '@jimo/schemas';
import { SyncStatus } from '../db/Status';
import { useHistory } from '../workouts/queries';
import { weekBounds, weekSchedule, localWeekday } from '../workouts/helpers';
import { exerciseSummary } from '../programs/summary';
import { MainButton, MainNotice, MainScreen, MainText } from './Surface';
import { completedExerciseCount, homePlanForDate } from './helpers';
import { useTraining } from './useTraining';
import { useDayStart } from './useDayStart';
import { WeekStrip } from './WeekStrip';
import { ExerciseThumbnail } from '../programs/ExerciseThumbnail';
import { HomeHero } from './HomeHero';
import { SectionBody } from '../components/SectionBody';
import { parseCalendarDate } from '../programs/date';
import { JimoDialog, PopupButton } from '../components/JimoDialog';

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
    scheduledToday = !!day,
    selectedActive =
      !!active &&
      active.programId === program?.id &&
      active.programDayId === day?.id;
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
  const [resumeConflict, setResumeConflict] = useState(false);
  const canStart = !!program && !!day?.exercises.length && !plan.completed;
  const label =
    selectedActive || action.conflict
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
    if (selectedActive && active)
      router.push({ pathname: '/workout/[id]', params: { id: active.id } });
    else if (active && canStart) setResumeConflict(true);
    else if (action.conflict || canStart) action.start();
    else if (!program) openProgram();
    else editSelected();
  };
  // The calendar always reads the current plan. A session snapshot belongs only
  // to the resume action and must never replace another selected day's exercises.
  const exercises = day?.exercises ?? [],
    thumb = exercises[0]?.exercise ?? null,
    dataUnavailable = !program && (!runtime.online || !runtime.owner);
  const rest = plan.state === 'rest';
  const closeConflict = () => {
    setResumeConflict(false);
    action.reset();
  };
  return (
    <MainScreen light>
      <HomeHero />
      <SectionBody testID="home-body" style={{ paddingTop: 12, gap: 16 }}>
        <WeekStrip
          week={week}
          selectedDate={selectedDate}
          onSelect={(date) =>
            setSelection({ week: weekKey, date: zonedDateKey(date, timeZone) })
          }
        />
        {active && !selectedActive ? (
          <Pressable
            testID="home-resume-workout"
            accessibilityRole="button"
            accessibilityLabel={t('workouts:resume')}
            onPress={() =>
              router.push({
                pathname: '/workout/[id]',
                params: { id: active.id },
              })
            }
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              minHeight: 56,
              padding: 12,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: animePink.border,
              backgroundColor: animePink.surfaceSoft,
            }}
          >
            <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
              <Text variant="caption" color={animePink.textSecondary}>
                {active.name}
              </Text>
              <Text variant="bodyMedium" color={animePink.primaryText}>
                {t('workouts:resume')}
              </Text>
            </View>
            <Play size={20} color={animePink.primaryText} accessible={false} />
          </Pressable>
        ) : null}
        {!rest ? (
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
        ) : null}
        {query.isPending || session.isPending ? (
          <MainNotice loading />
        ) : !program && (query.error || session.error) ? (
          <MainNotice retry={refresh} />
        ) : (
          <View
            testID="home-workout-card"
            style={{
              gap: 12,
              padding: 12,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: animePink.border,
              backgroundColor: animePink.surfaceSoft,
              ...uiDepth.card,
            }}
          >
            <View
              style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}
            >
              {!rest ? (
                thumb ? (
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
                )
              ) : null}
              <View style={{ flex: 1, minWidth: 0, gap: 5 }}>
                <MainText style={{ fontSize: 16, lineHeight: 21 }}>
                  {dataUnavailable
                    ? t('workouts:offline.connect')
                    : program
                      ? scheduledToday
                        ? day!.name
                        : t('restDay')
                      : t('noActivePlan')}
                </MainText>
                {!rest ? (
                  <>
                    <Text variant="caption" color={animePink.textSecondary}>
                      {selectedActive && active
                        ? t('exerciseProgress', {
                            completed: completedExerciseCount(active),
                            total: active.exercises.length,
                          })
                        : program
                          ? t('programs:exerciseCount', {
                              count: day?.exercises.length ?? 0,
                            })
                          : dataUnavailable
                            ? t('offline')
                            : t('common:home.description')}
                    </Text>
                    {!selectedActive &&
                    program &&
                    (!day?.exercises.length || plan.completed) ? (
                      <Text variant="caption" color={animePink.textSecondary}>
                        {plan.completed
                          ? t('workouts:workoutStatus.completed')
                          : t('emptyDay')}
                      </Text>
                    ) : null}
                  </>
                ) : null}
              </View>
            </View>
            <MainButton
              label={label}
              onPress={open}
              disabled={action.pending || dataUnavailable}
              subtle={!canStart || selectedActive}
            />
          </View>
        )}
        {action.error && !action.conflict ? (
          <MainNotice retry={action.start} />
        ) : null}
        <SyncStatus />
        {!rest ? (
          <>
            <MainText
              accessibilityRole="header"
              style={{ fontSize: 18, lineHeight: 24 }}
            >
              {t('nextExercises')}
            </MainText>
            {exercises.length ? (
              <View testID="home-upcoming-exercise" style={{ gap: 8 }}>
                {exercises.map((exercise) => (
                  <Pressable
                    key={exercise.id}
                    accessibilityRole="button"
                    accessibilityLabel={t('nextExerciseAction', {
                      name: exercise.exercise.displayName,
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
                      ...uiDepth.card,
                      opacity: pressed ? 0.8 : 1,
                    })}
                  >
                    <ExerciseThumbnail
                      exercise={exercise.exercise}
                      tone="light"
                    />
                    <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                      <MainText style={{ fontSize: 16, lineHeight: 21 }}>
                        {exercise.exercise.displayName}
                      </MainText>
                      <Text variant="caption" color={animePink.textSecondary}>
                        {
                          exerciseSummary(
                            exercise,
                            i18n.resolvedLanguage ?? 'en',
                            i18n.getFixedT(null, 'programs'),
                          ).primary
                        }
                      </Text>
                    </View>
                    <ChevronRight size={20} color={animePink.primaryPink} />
                  </Pressable>
                ))}
              </View>
            ) : (
              <Text variant="caption" color={animePink.textSecondary}>
                {t('noUpcoming')}
              </Text>
            )}
          </>
        ) : null}
      </SectionBody>
      <JimoDialog
        title={t('activeWorkoutTitle')}
        visible={resumeConflict || action.conflict}
        close={closeConflict}
        onDismiss={() => {}}
        footer={
          <>
            <PopupButton
              label={t('workouts:resume')}
              onPress={() => {
                if (active)
                  router.push({
                    pathname: '/workout/[id]',
                    params: { id: active.id },
                  });
                else action.start();
                closeConflict();
              }}
            />
            <PopupButton
              label={t('programs:cancel')}
              outline
              onPress={closeConflict}
            />
          </>
        }
      >
        <Text>{t('activeWorkoutNotice')}</Text>
      </JimoDialog>
    </MainScreen>
  );
}
