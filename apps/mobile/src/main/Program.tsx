import { SectionHeroFrame } from '../components/SectionHero';
import { SectionBody } from '../components/SectionBody';
import { useState, useRef } from 'react';
import { View, Platform, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text, IconButton, animePink } from '@jimo/ui';
import type { ProgramSummary } from '@jimo/schemas';
import Pencil from 'lucide-react-native/icons/pencil';
import { usePrograms, useProgram } from '../api/queries';
import { PendingReview } from '../imports/PendingReview';
import { MainButton, MainNotice, MainScreen, MainText } from './Surface';
import { weekdayNumbers } from '../programs/weekdays';
import { useTraining } from './useTraining';
import { DayCard } from './DayCard';
import { HeroTitle } from '../themes/anime-pink/HeroTitle';
import { EditPlanPopup } from '../programs/EditPlanPopup';
import { DayDialog } from '../programs/DayDialog';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import { useLocalSearchParams } from 'expo-router';
import { QuickPlanPopup } from '../programs/QuickPlanPopups';

type Sheet =
  | { kind: 'switch' }
  | { kind: 'create' }
  | { kind: 'edit'; program: ProgramSummary }
  | { kind: 'day'; weekday: number | null; dayId?: string };
export function MainProgram() {
  const { t } = useTranslation(['main', 'programs', 'workouts']);
  const list = usePrograms(),
    { program: cached, runtime } = useTraining();
  const summary = list.data?.programs.find((p) => p.status === 'active');
  const cachedMatches =
    !!cached.data &&
    cached.data.status === 'active' &&
    (!list.data || cached.data.id === summary?.id);
  const detail = useProgram(cachedMatches ? '' : (summary?.id ?? '')),
    program = cachedMatches ? cached.data : detail.data;
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const params = useLocalSearchParams<{ weekday?: string; openDay?: string }>();
  const requestedWeekday = Number(params.weekday),
    requestKey = `${program?.id}:${params.openDay}`;
  const [handledRequest, setHandledRequest] = useState<string | null>(null);
  const currentSheet: Sheet | null =
    sheet ??
    (program &&
    params.openDay &&
    handledRequest !== requestKey &&
    Number.isInteger(requestedWeekday) &&
    requestedWeekday >= 1 &&
    requestedWeekday <= 7
      ? { kind: 'day', weekday: requestedWeekday }
      : null);
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
  const nextEdit = useRef<ProgramSummary | null>(null);
  const finishClose = () => {
    if (!closingRef.current) return;
    closingRef.current = false;
    setSheet(null);
    setHandledRequest(requestKey);
    setClosing(false);
    const next = nextEdit.current;
    nextEdit.current = null;
    if (next) setSheet({ kind: 'edit', program: next });
  };
  const close = () => {
    if (closingRef.current) return;
    closingRef.current = true;
    setClosing(true);
    if (Platform.OS !== 'ios') requestAnimationFrame(finishClose);
  };
  return (
    <MainScreen>
      <SectionHeroFrame
        testID="program-tab-hero"
        style={{ justifyContent: 'flex-start', paddingTop: 22 }}
      >
        <HeroTitle accessibilityRole="header">{t('title')}</HeroTitle>
      </SectionHeroFrame>
      <SectionBody testID="program-tab-body">
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
                  onPress={() => setSheet({ kind: 'edit', program })}
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
              </View>
            </View>
            <View style={{ gap: 8 }}>
              {weekdayNumbers.map((weekday) => {
                const days = program.days.filter(
                  (day) => day.dayOfWeek === weekday,
                );
                return days.length ? (
                  days.map((day) => (
                    <DayCard
                      key={day.id}
                      day={day}
                      onPress={() =>
                        setSheet({ kind: 'day', weekday, dayId: day.id })
                      }
                    />
                  ))
                ) : (
                  <Pressable
                    key={weekday}
                    testID={`program-rest-${weekday}`}
                    accessibilityRole="button"
                    accessibilityLabel={`${t(`programs:weekdays.${weekday}`)}, ${t('restDay')}`}
                    accessibilityHint={t('programs:addDay')}
                    onPress={() => setSheet({ kind: 'day', weekday })}
                    style={({ pressed }) => ({
                      minHeight: 72,
                      paddingVertical: 12,
                      borderBottomWidth: 1,
                      borderColor: animePink.border,
                      opacity: pressed ? 0.7 : 1,
                      gap: 12,
                      flexDirection: 'row',
                      alignItems: 'center',
                    })}
                  >
                    <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                      <MainText style={{ fontSize: 18 }}>
                        {t(`programs:weekdays.${weekday}`)}
                      </MainText>
                      <Text variant="caption" color={animePink.textSecondary}>
                        {t('restDay')}
                      </Text>
                    </View>
                    <ChevronRight
                      size={22}
                      color={animePink.primaryText}
                      accessible={false}
                    />
                  </Pressable>
                );
              })}
              {program.days
                .filter((day) => day.dayOfWeek === null)
                .map((day) => (
                  <DayCard
                    key={day.id}
                    day={day}
                    onPress={() =>
                      setSheet({ kind: 'day', weekday: null, dayId: day.id })
                    }
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
      {currentSheet?.kind === 'edit' ? (
        <EditPlanPopup
          key={currentSheet.program.id}
          program={currentSheet.program}
          visible={!closing}
          onDismiss={finishClose}
          close={close}
        />
      ) : currentSheet?.kind === 'day' ? (
        program ? (
          <DayDialog
            key={`${program.id}:${currentSheet.weekday}:${currentSheet.dayId ?? ''}`}
            program={program}
            weekday={currentSheet.weekday}
            {...(currentSheet.dayId
              ? { initialDayId: currentSheet.dayId }
              : {})}
            visible={!closing}
            onDismiss={finishClose}
            close={close}
          />
        ) : null
      ) : currentSheet ? (
        <QuickPlanPopup
          mode={currentSheet.kind}
          programs={list.data?.programs ?? []}
          close={close}
          visible={!closing}
          onDismiss={finishClose}
          onNew={() => setSheet({ kind: 'create' })}
          onManage={(id) => {
            const selected = list.data?.programs.find((p) => p.id === id);
            if (selected) {
              nextEdit.current = selected;
              close();
            }
          }}
        />
      ) : null}
    </MainScreen>
  );
}
