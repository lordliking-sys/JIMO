import { SectionHeroFrame } from '../components/SectionHero';
import { SectionBody } from '../components/SectionBody';
import { useState, useRef } from 'react';
import { View, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text, IconButton, animePink } from '@jimo/ui';
import Pencil from 'lucide-react-native/icons/pencil';
import { usePrograms, useProgram } from '../api/queries';
import { useHistory } from '../workouts/queries';
import { PendingReview } from '../imports/PendingReview';
import { MainButton, MainNotice, MainScreen, MainText } from './Surface';
import { programWeek, selectedWeekBounds, dayStates } from './helpers';
import { useTraining } from './useTraining';
import { DayCard } from './DayCard';
import { WeekSelector } from './WeekSelector';
import { HeroTitle } from '../themes/anime-pink/HeroTitle';
import { ProgramOverlay } from '../programs/ProgramOverlay';
import { ProgramManagement } from '../programs/ProgramManagement';
import { PlanSwitcher } from '../programs/PlanSwitcher';
import { CreatePlan } from '../programs/CreatePlan';

type Sheet =
  | { kind: 'switch'; selectedId?: string }
  | { kind: 'create' }
  | { kind: 'manage'; id: string };
export function MainProgram() {
  const { t } = useTranslation(['main', 'programs']),
    router = useRouter();
  const list = usePrograms(),
    { program: cached, session, now, runtime } = useTraining();
  const summary = list.data?.programs.find((p) => p.status === 'active');
  const cachedMatches =
    !!cached.data &&
    cached.data.status === 'active' &&
    (!list.data || cached.data.id === summary?.id);
  const detail = useProgram(cachedMatches ? '' : (summary?.id ?? '')),
    program = cachedMatches ? cached.data : detail.data;
  const [sheet, setSheet] = useState<Sheet | null>(null),
    [selection, setSelection] = useState<{
      programId: string;
      week: number;
    } | null>(null);
  const weeks = programWeek(program, now),
    selected =
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
  const pending =
    !program &&
    (cached.isPending || list.isPending || (!!summary && detail.isPending));
  const failed = !program && (list.error || detail.error || cached.error);
  const retry = () => {
    void list.refetch();
    if (summary && !cachedMatches) void detail.refetch();
    void runtime.engine.request(true);
  };
  const [closing, setClosing] = useState(false);
  const closingRef = useRef(false);
  const nextDay = useRef<{ id: string; dayId: string } | null>(null);
  const finishClose = () => {
    if (!closingRef.current) return;
    closingRef.current = false;
    setSheet(null);
    setClosing(false);
    const next = nextDay.current;
    nextDay.current = null;
    if (next)
      router.push({
        pathname: '/program/[id]/day-detail',
        params: { ...next, backTo: 'scheda' },
      });
  };
  const close = () => {
    if (closingRef.current) return;
    closingRef.current = true;
    setClosing(true);
    if (Platform.OS !== 'ios') requestAnimationFrame(finishClose);
  };
  const openDay = (dayId: string) => {
    if (sheet?.kind !== 'manage') return;
    nextDay.current = { id: sheet.id, dayId };
    close();
  };
  return (
    <MainScreen>
      <SectionHeroFrame
        testID="program-tab-hero"
        style={{ justifyContent: 'flex-start', paddingTop: 22 }}
      >
        <HeroTitle accessibilityRole="header">{t('title')}</HeroTitle>
      </SectionHeroFrame>
      <SectionBody testID="program-tab-body" color={animePink.surface}>
        <PendingReview />
        {pending ? (
          <MainNotice loading />
        ) : failed ? (
          <MainNotice retry={retry} />
        ) : program ? (
          <>
            <View testID="active-plan-heading" style={{ gap: 8 }}>
              <View
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
              >
                <MainText
                  accessibilityRole="header"
                  style={{ flex: 1, minWidth: 0, fontSize: 24, lineHeight: 31 }}
                >
                  {program.name}
                </MainText>
                <IconButton
                  label={t('managePlan')}
                  icon={<Pencil size={20} color={animePink.primaryText} />}
                  onPress={() => setSheet({ kind: 'manage', id: program.id })}
                />
              </View>
              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <View
                  style={{
                    backgroundColor: animePink.primaryPinkPale,
                    borderRadius: 12,
                    paddingVertical: 4,
                    paddingHorizontal: 10,
                  }}
                >
                  <Text variant="label" color={animePink.primaryText}>
                    {t('activePlan')}
                  </Text>
                </View>
                <Text variant="caption" color={animePink.textSecondary}>
                  {t('programs:dayCount', { count: program.days.length })}
                  {program.durationWeeks
                    ? ` · ${t('programs:weekCount', { count: program.durationWeeks })}`
                    : ''}
                </Text>
              </View>
            </View>
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
              <Text variant="label">{t('currentWeek')}</Text>
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
                />
              ))}
              {!program.days.length ? (
                <Text color={animePink.textSecondary}>
                  {t('programs:noDaysHint')}
                </Text>
              ) : null}
            </View>
          </>
        ) : (
          <View testID="no-active-plan" style={{ gap: 8 }}>
            <MainText accessibilityRole="header">{t('noActivePlan')}</MainText>
            <Text color={animePink.textSecondary}>{t('noActivePlanHint')}</Text>
          </View>
        )}
        <View style={{ gap: 8, paddingTop: 8 }}>
          <MainButton
            subtle
            label={t('newPlan')}
            onPress={() => setSheet({ kind: 'create' })}
          />
          <MainButton
            subtle
            label={t('switchPlan')}
            onPress={() => setSheet({ kind: 'switch' })}
          />
        </View>
      </SectionBody>
      {sheet ? (
        <ProgramOverlay
          visible={!closing}
          onDismiss={finishClose}
          back={() =>
            sheet.kind === 'switch' && sheet.selectedId
              ? setSheet({ kind: 'switch' })
              : close()
          }
          {...(sheet.kind === 'manage' ? { title: t('managePlan') } : {})}
        >
          {sheet.kind === 'switch' ? (
            <PlanSwitcher
              {...(sheet.selectedId ? { selectedId: sheet.selectedId } : {})}
              select={(selectedId) => setSheet({ kind: 'switch', selectedId })}
              programs={list.data?.programs ?? []}
              onActivated={close}
              onManage={(id) => setSheet({ kind: 'manage', id })}
            />
          ) : sheet.kind === 'create' ? (
            <CreatePlan onCreated={close} />
          ) : (
            <ProgramManagement
              key={sheet.id}
              id={sheet.id}
              onSaved={close}
              onDeleted={close}
              onOpenDay={openDay}
            />
          )}
        </ProgramOverlay>
      ) : null}
    </MainScreen>
  );
}
