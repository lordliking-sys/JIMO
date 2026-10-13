import { SectionHeroFrame } from '../components/SectionHero';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text, animePink } from '@jimo/ui';
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
import { ThemeArtwork } from '../themes/anime-pink/Artwork';
import { animePinkAssets } from '../themes/anime-pink/assets';
import { HeroTitle } from '../themes/anime-pink/HeroTitle';

export function MainProgram() {
  const { t } = useTranslation(['main', 'programs', 'common']),
    router = useRouter();
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
      <SectionHeroFrame
        testID="program-tab-hero"
        style={{ justifyContent: 'flex-start', paddingTop: 22 }}
      >
        <View
          style={{
            paddingTop: 0,
            paddingBottom: 0,
            paddingHorizontal: 0,
          }}
        >
          <HeroTitle
            accessibilityRole="header"
            style={{ fontSize: 32, lineHeight: 36 }}
          >
            {t('title')}
          </HeroTitle>
          <Text
            variant="caption"
            color={animePink.white}
            style={{ letterSpacing: 2, marginTop: 6 }}
          >
            {t('yourPrograms')}
          </Text>
          {program ? (
            <Pressable
              testID="program-header-action"
              accessibilityRole="button"
              accessibilityLabel={t('programs:editProgram')}
              onPress={() =>
                router.push({
                  pathname: '/program/[id]',
                  params: { id: program.id },
                })
              }
              style={({ pressed }) => ({
                position: 'absolute',
                right: 0,
                top: 0,
                width: 48,
                height: 48,
                borderRadius: 24,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: animePink.darkOverlay,
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Pencil size={19} color={animePink.white} />
            </Pressable>
          ) : null}
        </View>
      </SectionHeroFrame>
      <View
        testID="program-tab-body"
        style={{
          backgroundColor: animePink.background,
          paddingTop: 18,
          marginTop: -24,
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
        }}
      >
        <PendingReview />
        {pending ? (
          <MainNotice loading />
        ) : failed ? (
          <MainNotice retry={retry} />
        ) : !program ? (
          <View
            style={{
              backgroundColor: animePink.surface,
              borderColor: mainInk.border,
              borderWidth: 1,
              borderRadius: 20,
              padding: 20,
              gap: 14,
            }}
          >
            <MainText style={{ fontSize: 22 }}>{t('programs:empty')}</MainText>
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
            <Pressable
              testID="active-program-card"
              accessibilityRole="button"
              accessibilityLabel={`${t('programs:open')} ${program.name}`}
              onPress={() =>
                router.push({
                  pathname: '/program/[id]',
                  params: { id: program.id },
                })
              }
              style={{
                backgroundColor: animePink.surface,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: mainInk.border,
                padding: 16,
                marginBottom: 16,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <View
                style={{
                  width: 64,
                  height: 70,
                  borderRadius: 14,
                  overflow: 'hidden',
                }}
              >
                <ThemeArtwork source={animePinkAssets['program.hero']} />
              </View>
              <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                <MainText style={{ fontSize: 19, lineHeight: 25 }}>
                  {program.name}
                </MainText>
                <Text variant="caption" color={mainInk.muted}>
                  {t(`programs:${statusKey(program.status)}`)} ·{' '}
                  {t('programs:dayCount', { count: program.days.length })}
                </Text>
                {program.description ? (
                  <Text variant="caption" color={mainInk.muted}>
                    {program.description}
                  </Text>
                ) : null}
              </View>
              <ChevronRight size={20} color={animePink.primaryText} />
            </Pressable>
            {program.status !== 'active' ? (
              <Text
                variant="caption"
                color={mainInk.green}
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
                onSelect={(week) =>
                  setSelection({ programId: program.id, week })
                }
              />
            ) : (
              <View
                style={{
                  minHeight: 48,
                  padding: 12,
                  borderRadius: 14,
                  backgroundColor: animePink.surface,
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
              {program.days.map((day) => (
                <DayCard
                  key={day.id}
                  program={program}
                  day={day}
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
                    backgroundColor: animePink.surface,
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
              paddingHorizontal: 6,
              paddingVertical: 4,
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
                  router.push({
                    pathname: '/program/[id]',
                    params: { id: p.id },
                  })
                }
                style={({ pressed }) => ({
                  minHeight: 56,
                  paddingVertical: 8,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  borderWidth: 1,
                  borderColor: mainInk.border,
                  backgroundColor: animePink.surface,
                  borderRadius: 20,
                  paddingHorizontal: 14,
                  marginBottom: 8,
                  borderBottomColor: mainInk.border,
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <View
                  style={{
                    width: 56,
                    height: 60,
                    borderRadius: 12,
                    overflow: 'hidden',
                  }}
                >
                  <ThemeArtwork source={animePinkAssets['program.hero']} />
                </View>
                <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                  <MainText style={{ fontSize: 18 }}>{p.name}</MainText>
                  <Text variant="caption" color={mainInk.muted}>
                    {t(`programs:${statusKey(p.status)}`)} ·{' '}
                    {t('programs:dayCount', { count: p.daysCount })}
                  </Text>
                </View>
                <ChevronRight size={18} color={mainInk.muted} />
              </Pressable>
            ))}
          </View>
        ) : null}
        {program ? (
          <Pressable
            testID="program-new-action"
            accessibilityRole="button"
            accessibilityLabel={t('programs:newProgram')}
            onPress={() => router.push('/program/manual')}
            style={({ pressed }) => ({
              minHeight: 48,
              paddingHorizontal: 8,
              paddingVertical: 10,
              borderRadius: 24,
              marginTop: 8,
              justifyContent: 'center',
              alignSelf: 'flex-start',
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <MainText style={{ fontSize: 21, color: mainInk.green }}>
              {t('programs:newProgram')}
            </MainText>
          </Pressable>
        ) : null}
      </View>
    </MainScreen>
  );
}
