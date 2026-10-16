import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import ArrowDownUp from 'lucide-react-native/icons/arrow-down-up';
import { Text, IconButton, Button, animePink } from '@jimo/ui';
import type { ExerciseDto, Prescription, ProgramDetail } from '@jimo/schemas';
import { useApiLocale, useProgramMutation } from '../api/queries';
import { programsApi } from '../api/programs';
import { ProgramPopup, PopupButton } from './ProgramPopup';
import { DayEditor } from './DayEditor';
import { ExerciseLibrary } from './ExerciseLibrary';
import { CustomExerciseEditor } from './CustomExerciseEditor';
import { PrescriptionEditor } from './PrescriptionEditor';
import { ExerciseThumbnail } from './ExerciseThumbnail';
import { ErrorNotice } from './components';
import { moved } from './helpers';

/** One native modal and an internal step stack; all writes use the existing mutation/cache path. */
export function DayDialog({
  program,
  weekday,
  initialDayId,
  close,
  visible,
  onDismiss,
}: {
  program: ProgramDetail;
  weekday: number | null;
  initialDayId?: string;
  close(): void;
  visible: boolean;
  onDismiss(): void;
}) {
  const { t } = useTranslation(['programs', 'main']),
    locale = useApiLocale();
  const [dayId, setDayId] = useState(
    initialDayId ?? program.days.find((d) => d.dayOfWeek === weekday)?.id,
  );
  const day = program.days.find((d) => d.id === dayId);
  const [step, setStep] = useState<
      'day' | 'edit' | 'library' | 'custom' | 'exercise'
    >('day'),
    [exercise, setExercise] = useState<ExerciseDto | null>(null),
    [entryId, setEntryId] = useState<string | undefined>(),
    [more, setMore] = useState(false),
    [confirm, setConfirm] = useState<'day' | 'exercise' | null>(null);
  const entry = day?.exercises.find((e) => e.id === entryId);
  const mutate = useProgramMutation(
    (action: () => ReturnType<typeof programsApi.detail>) => action(),
  );
  const save = useProgramMutation((input: Prescription) =>
    programsApi.saveExercise(day!.id, entryId, input, locale),
  );
  const title =
    step === 'library'
      ? t('addExercise')
      : step === 'custom'
        ? t('customTitle')
        : step === 'exercise'
          ? (exercise?.displayName ?? '')
          : weekday
            ? t(`weekdays.${weekday as 1 | 2 | 3 | 4 | 5 | 6 | 7}`)
            : (day?.name ?? t('newDay'));
  const go = (next: typeof step) => {
    setConfirm(null);
    mutate.reset();
    save.reset();
    setStep(next);
  };
  const back = () =>
    go(
      (step === 'exercise' && !entryId) || step === 'custom'
        ? 'library'
        : 'day',
    );
  const run = (
    action: () => ReturnType<typeof programsApi.detail>,
    success?: () => void,
  ) =>
    mutate.mutate(action, {
      onSuccess: () => {
        setConfirm(null);
        success?.();
      },
    });
  const footer = confirm ? (
    <>
      <Text accessibilityRole="alert" color={animePink.ink}>
        {t(confirm === 'day' ? 'confirmDeleteDay' : 'confirmRemoveExercise')}
      </Text>
      <PopupButton
        label={t('confirm')}
        busy={mutate.isPending}
        onPress={() =>
          confirm === 'day'
            ? run(
                () => programsApi.removeDay(day!.id, locale),
                () => {
                  if (weekday === null) close();
                  else {
                    setDayId(undefined);
                    go('day');
                  }
                },
              )
            : run(
                () => programsApi.removeExercise(entry!.id, locale),
                () => go('day'),
              )
        }
      />
      <PopupButton
        label={t('cancel')}
        outline
        disabled={mutate.isPending}
        onPress={() => setConfirm(null)}
      />
    </>
  ) : step === 'day' ? (
    day ? (
      <>
        <PopupButton
          label={t('addExercise')}
          disabled={mutate.isPending || save.isPending}
          onPress={() => {
            setEntryId(undefined);
            setExercise(null);
            go('library');
          }}
        />
        <PopupButton
          label={t('editDay')}
          outline
          disabled={mutate.isPending || save.isPending}
          onPress={() => go('edit')}
        />
        <Button
          label={t('delete')}
          variant="text"
          disabled={mutate.isPending || save.isPending}
          onPress={() => setConfirm('day')}
          style={{ alignSelf: 'center', paddingVertical: 8 }}
          labelStyle={{ fontSize: 14, color: animePink.danger }}
        />
      </>
    ) : (
      <PopupButton
        label={t('createWeekdayWorkout', { day: title })}
        disabled={mutate.isPending || save.isPending}
        onPress={() => go('edit')}
      />
    )
  ) : null;
  return (
    <ProgramPopup
      title={title}
      titleAlign={step === 'day' || step === 'edit' ? 'center' : 'left'}
      close={close}
      visible={visible}
      onDismiss={onDismiss}
      busy={mutate.isPending || save.isPending}
      scrollKey={`${step}:${entryId ?? exercise?.id ?? dayId ?? ''}`}
      {...(step !== 'day' ? { back, backLabel: t('back') } : {})}
      footer={footer}
    >
      {step === 'day' ? (
        <View testID="day-dialog-detail" style={{ gap: 12 }}>
          {day ? (
            <>
              {day.name !== title ? (
                <Text
                  variant="h3"
                  color={animePink.ink}
                  style={{ textAlign: 'center', fontSize: 22 }}
                >
                  {day.name}
                </Text>
              ) : null}
              {day.notes ? (
                <Text
                  color={animePink.textSecondary}
                  style={{ textAlign: 'center' }}
                >
                  {day.notes}
                </Text>
              ) : null}
              <View
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
              >
                <Text
                  color={animePink.primaryText}
                  style={{
                    flex: 1,
                    fontSize: 14,
                    fontFamily: 'Inter_600SemiBold',
                  }}
                >
                  {t('exerciseCount', { count: day.exercises.length })}
                </Text>
                <IconButton
                  icon={<ArrowDownUp size={20} color={animePink.primaryText} />}
                  label={t('reorder')}
                  disabled={mutate.isPending || save.isPending}
                  onPress={() => setMore(!more)}
                />
              </View>
              {day.exercises.map((item, index) => (
                <View key={item.id} style={{ gap: 4 }}>
                  <Pressable
                    testID={`day-dialog-exercise-${item.id}`}
                    accessibilityRole="button"
                    accessibilityLabel={`${t('editExercise')} ${item.exercise.displayName}`}
                    disabled={mutate.isPending}
                    onPress={() => {
                      setEntryId(item.id);
                      setExercise(item.exercise);
                      go('exercise');
                    }}
                    style={({ pressed }) => ({
                      minHeight: 64,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                      borderBottomWidth: 1,
                      borderColor: animePink.border,
                      opacity: pressed ? 0.7 : 1,
                      paddingVertical: 6,
                    })}
                  >
                    <ExerciseThumbnail exercise={item.exercise} tone="light" />
                    <Text
                      style={{
                        flex: 1,
                        minWidth: 0,
                        color: animePink.ink,
                        fontSize: 16,
                      }}
                    >
                      {item.exercise.displayName}
                    </Text>
                    <ChevronRight
                      size={19}
                      color={animePink.primaryText}
                      accessible={false}
                    />
                  </Pressable>
                  {more ? (
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {([-1, 1] as const).map((direction) => (
                        <View key={direction} style={{ flex: 1 }}>
                          <PopupButton
                            outline
                            label={`${t(direction < 0 ? 'moveUp' : 'moveDown')} ${item.exercise.displayName}`}
                            disabled={
                              mutate.isPending ||
                              index + direction < 0 ||
                              index + direction >= day.exercises.length
                            }
                            onPress={() =>
                              run(() =>
                                programsApi.reorderExercises(
                                  day.id,
                                  moved(day.exercises, index, direction).map(
                                    (e) => e.id,
                                  ),
                                  locale,
                                ),
                              )
                            }
                          />
                        </View>
                      ))}
                    </View>
                  ) : null}
                </View>
              ))}
              {!day.exercises.length ? (
                <Text color={animePink.textSecondary}>
                  {t('noDayExercises')}
                </Text>
              ) : null}
              {more ? (
                <>
                  {([-1, 1] as const).map((direction) => {
                    const index = program.days.findIndex(
                      (d) => d.id === day.id,
                    );
                    return (
                      <PopupButton
                        key={direction}
                        outline
                        label={`${t(direction < 0 ? 'moveUp' : 'moveDown')} ${day.name}`}
                        disabled={
                          mutate.isPending ||
                          index + direction < 0 ||
                          index + direction >= program.days.length
                        }
                        onPress={() =>
                          run(() =>
                            programsApi.reorderDays(
                              program.id,
                              moved(program.days, index, direction).map(
                                (d) => d.id,
                              ),
                              locale,
                            ),
                          )
                        }
                      />
                    );
                  })}
                </>
              ) : null}
            </>
          ) : (
            <Text color={animePink.textSecondary}>{t('main:restDay')}</Text>
          )}
        </View>
      ) : step === 'edit' ? (
        <DayEditor
          key={dayId ?? `new-${weekday}`}
          id={program.id}
          {...(day ? { day } : {})}
          fixedWeekday={weekday}
          onSaved={(next) => {
            if (!day)
              setDayId(
                next.days.find(
                  (d) => !program.days.some((old) => old.id === d.id),
                )?.id,
              );
            go('day');
          }}
        />
      ) : step === 'library' ? (
        <ExerciseLibrary
          onChoose={(selected) => {
            setExercise(selected);
            setEntryId(undefined);
            go('exercise');
          }}
          onCustom={() => go('custom')}
        />
      ) : step === 'custom' ? (
        <CustomExerciseEditor
          onCreated={(created) => {
            setExercise(created);
            setEntryId(undefined);
            go('exercise');
          }}
        />
      ) : exercise ? (
        <PrescriptionEditor
          key={entryId ?? exercise.id}
          presentation
          exercise={exercise}
          {...(entry ? { initial: entry } : {})}
          pending={save.isPending || mutate.isPending}
          error={save.error}
          save={(input) => save.mutate(input, { onSuccess: () => go('day') })}
          extraActions={
            entry && !confirm ? (
              <PopupButton
                outline
                label={t('removeExercise')}
                disabled={save.isPending || mutate.isPending}
                onPress={() => setConfirm('exercise')}
              />
            ) : null
          }
        />
      ) : null}
      {mutate.error ? <ErrorNotice error={mutate.error} /> : null}
    </ProgramPopup>
  );
}
