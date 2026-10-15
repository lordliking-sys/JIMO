import { useState } from 'react';
import { View, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '@jimo/ui';
import {
  prescriptionFor,
  type ExerciseDto,
  type Prescription,
  type PerSetTarget,
} from '@jimo/schemas';
import { FormScreen, FormHeader, ErrorNotice, Field } from './components';
import { ProgramButton, programInk } from './presentation';
import { NumberControl, Choice, choiceStyles } from './NumberControl';
import { RestControl } from './RestControl';
import { useDialogForm } from '../components/JimoDialog';
import {
  decimalDisplay,
  decimalInput,
  integerInput,
  stepInteger,
  stepDecimal,
  moved,
} from './helpers';
import type { Href } from 'expo-router';

export function ModePrescriptionEditor({
  exercise,
  initial,
  seriesMode,
  onMode,
  save,
  pending,
  error,
  fallback,
  extraActions,
}: {
  exercise: ExerciseDto;
  initial?: Partial<Prescription>;
  seriesMode: 'emom' | 'pyramid';
  onMode(mode: 'standard' | 'emom' | 'pyramid'): void;
  save(input: Prescription): void;
  pending: boolean;
  error: unknown;
  fallback?: Href;
  extraActions?: import('react').ReactNode;
}) {
  const { t, i18n } = useTranslation('programs');
  const locale = i18n.resolvedLanguage ?? 'it';
  const [loadMode, setLoadMode] = useState<Prescription['loadMode']>(
    initial?.loadMode ?? exercise.defaultLoadMode ?? 'bodyweight',
  );
  const seed = () => ({
    reps: String(initial?.targetReps ?? 8),
    duration: String(initial?.targetDurationSeconds ?? 60),
    load: decimalDisplay(
      initial?.targetLoadKg ?? initial?.targetAssistanceKg,
      locale,
    ),
    rpe: decimalDisplay(initial?.targetRpe, locale),
    rest: String(initial?.restSeconds ?? ''),
  });
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [rounds, setRounds] = useState(String(initial?.targetSets ?? 3));
  const [targets, setTargets] = useState(
    () =>
      initial?.setTargets?.map((s) => ({
        reps: String(s.targetReps ?? ''),
        duration: String(s.targetDurationSeconds ?? ''),
        load: decimalDisplay(s.targetLoadKg ?? s.targetAssistanceKg, locale),
        rpe: decimalDisplay(s.targetRpe, locale),
        rest: String(s.restSeconds ?? ''),
      })) ?? Array.from({ length: initial?.targetSets ?? 3 }, seed),
  );
  const [selected, setSelected] = useState(0),
    [invalid, setInvalid] = useState(false);
  const formValues = { loadMode, notes, rounds, targets };
  const [originalForm] = useState(() => JSON.stringify(formValues));
  useDialogForm(JSON.stringify(formValues) !== originalForm, pending);
  const draft = targets[selected]!;
  const change = (key: keyof typeof draft, value: string) => {
    setTargets((old) =>
      old.map((s, i) => (i === selected ? { ...s, [key]: value } : s)),
    );
    setInvalid(false);
  };
  const number = (
    label: string,
    key: 'reps' | 'duration' | 'load' | 'rpe',
    decimal = false,
  ) => (
    <NumberControl
      label={label}
      value={draft[key]}
      onChange={(v) => change(key, v)}
      keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
      onStep={(d) => {
        try {
          change(
            key,
            decimal
              ? decimalDisplay(
                  stepDecimal(
                    decimalInput(
                      draft[key] || (key === 'rpe' ? '8' : '0'),
                      key === 'rpe' ? 1 : 2,
                    ),
                    key === 'rpe' ? '0.5' : '2.5',
                    d,
                    key === 'rpe' ? 1 : 2,
                  ),
                  locale,
                )
              : stepInteger(draft[key], d, {
                  min: key === 'duration' ? 1 : 0,
                  max: 1000000,
                  initial: 8,
                }),
          );
        } catch {
          setInvalid(true);
        }
      }}
    />
  );
  const submit = () => {
    if (pending) return;
    try {
      const perSet = (s: typeof draft): PerSetTarget => ({
        targetReps:
          exercise.trackingMode === 'reps' ? integerInput(s.reps) : null,
        targetDurationSeconds:
          exercise.trackingMode === 'duration'
            ? integerInput(s.duration)
            : null,
        targetLoadKg:
          ['weighted', 'external'].includes(loadMode) && s.load.trim()
            ? decimalInput(s.load, 2)
            : null,
        targetAssistanceKg:
          loadMode === 'assisted' && s.load.trim()
            ? decimalInput(s.load, 2)
            : null,
        targetRpe: s.rpe.trim() ? decimalInput(s.rpe, 1) : null,
        restSeconds: s.rest.trim() ? integerInput(s.rest) : null,
      });
      const list = targets.map(perSet),
        first = list[0]!;
      save(
        prescriptionFor(exercise.trackingMode).parse({
          exerciseId: exercise.id,
          loadMode,
          workoutMode: seriesMode,
          targetSets:
            seriesMode === 'emom' ? integerInput(rounds) : list.length,
          ...first,
          targetRepMin: null,
          targetRepMax: null,
          emomIntervalSeconds:
            seriesMode === 'emom' ? (initial?.emomIntervalSeconds ?? 60) : null,
          setTargets: seriesMode === 'pyramid' ? list : null,
          notes: notes.trim() || null,
        }),
      );
      setInvalid(false);
    } catch {
      setInvalid(true);
    }
  };
  return (
    <FormScreen
      presentation
      header={<FormHeader title={exercise.displayName} />}
      {...(fallback ? { fallback } : {})}
      invalid={invalid}
      footer={
        <ProgramButton
          label={t(initial ? 'saveChanges' : 'saveExercise')}
          busy={pending}
          onPress={submit}
        />
      }
    >
      <Text color={programInk.text}>{t('seriesType')}</Text>
      <View style={choiceStyles.row}>
        {(['standard', 'pyramid', 'emom'] as const)
          .filter((m) => m !== 'emom' || exercise.trackingMode === 'reps')
          .map((m) => (
            <Choice
              key={m}
              label={t(`seriesModes.${m}`)}
              selected={m === seriesMode}
              onPress={() => onMode(m)}
            />
          ))}
      </View>
      <Text color={programInk.text}>{t('mode')}</Text>
      <View style={choiceStyles.row}>
        {(
          [
            'bodyweight',
            'weighted',
            'external',
            ...(loadMode === 'assisted' ? ['assisted' as const] : []),
          ] as const
        ).map((m) => (
          <Choice
            key={m}
            label={t(`loadModes.${m}`)}
            selected={loadMode === m}
            onPress={() => {
              setLoadMode(m);
              setTargets((old) => old.map((s) => ({ ...s, load: '' })));
            }}
          />
        ))}
      </View>
      {seriesMode === 'emom' ? (
        <>
          <NumberControl
            label={t('rounds')}
            value={rounds}
            onChange={setRounds}
            min={1}
            max={100}
            onStep={(d) =>
              setRounds(
                stepInteger(rounds, d, { min: 1, max: 100, initial: 3 }),
              )
            }
          />
          <Text variant="caption" color={programInk.secondary}>
            {t('intervalSeconds', {
              seconds: initial?.emomIntervalSeconds ?? 60,
            })}
          </Text>
        </>
      ) : (
        <View testID="pyramid-builder" style={{ gap: 6 }}>
          {targets.map((s, i) => (
            <Pressable
              key={i}
              accessibilityRole="button"
              accessibilityLabel={`${t('setTarget')} ${i + 1}`}
              accessibilityState={{ selected: selected === i }}
              onPress={() => setSelected(i)}
              style={{
                minHeight: 48,
                padding: 12,
                borderRadius: 14,
                borderWidth: 1,
                borderColor:
                  selected === i ? programInk.sage : programInk.border,
                backgroundColor: programInk.field,
              }}
            >
              <Text color={programInk.text}>
                {String(i + 1).padStart(2, '0')} ·{' '}
                {exercise.trackingMode === 'reps'
                  ? `${s.reps} reps`
                  : `${s.duration} s`}
                {loadMode !== 'bodyweight' ? ` · ${s.load || '—'} kg` : ''}
              </Text>
            </Pressable>
          ))}
          <View style={choiceStyles.row}>
            <ProgramButton
              label={t('addSet')}
              disabled={targets.length >= 100}
              onPress={() => {
                setTargets((old) => [...old, { ...draft }]);
                setSelected(targets.length);
              }}
            />
            <ProgramButton
              variant="outline"
              label={t('removeSet')}
              disabled={targets.length <= 1}
              onPress={() => {
                setTargets((old) => old.filter((_, i) => i !== selected));
                setSelected(Math.max(0, selected - 1));
              }}
            />
            {([-1, 1] as const).map((d) => (
              <ProgramButton
                key={d}
                variant="text"
                label={t(d === -1 ? 'moveUp' : 'moveDown')}
                disabled={selected + d < 0 || selected + d >= targets.length}
                onPress={() => {
                  setTargets((old) => moved(old, selected, d));
                  setSelected(selected + d);
                }}
              />
            ))}
          </View>
        </View>
      )}
      {number(
        seriesMode === 'pyramid'
          ? t(exercise.trackingMode === 'reps' ? 'setReps' : 'setDuration', {
              set: selected + 1,
            })
          : t(exercise.trackingMode === 'reps' ? 'reps' : 'duration'),
        exercise.trackingMode === 'reps' ? 'reps' : 'duration',
      )}
      {loadMode !== 'bodyweight'
        ? number(
            t(
              loadMode === 'weighted'
                ? 'addedLoad'
                : loadMode === 'assisted'
                  ? 'assistance'
                  : 'load',
            ),
            'load',
            true,
          )
        : null}
      {number(t('rpe'), 'rpe', true)}
      {seriesMode === 'pyramid' ? (
        <RestControl
          value={draft.rest}
          onChange={(v) => change('rest', v)}
          invalid={() => setInvalid(true)}
        />
      ) : null}
      <Field
        label={t('notes')}
        value={notes}
        onChangeText={setNotes}
        multiline
        maxLength={2000}
      />
      {error ? <ErrorNotice error={error} /> : null}
      {extraActions}
    </FormScreen>
  );
}
