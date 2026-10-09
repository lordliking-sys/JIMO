import { useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  prescriptionFor,
  loadModes,
  type Prescription,
  type ExerciseDto,
} from '@jimo/schemas';
import { Text, Button, colors } from '@jimo/ui';
import {
  FormHeader,
  Field,
  ErrorNotice,
  FormScreen,
  FormSection,
} from './components';
import {
  integerInput,
  decimalInput,
  decimalDisplay,
  stepDecimal,
  stepInteger,
  loadFields,
} from './helpers';
import { ProgramButton, programInk } from './presentation';
import type { Href } from 'expo-router';
import { NumberControl, Choice, choiceStyles } from './NumberControl';
export function PrescriptionEditor({
  save,
  pending,
  error,
  exercise,
  initial,
  mappingAction,
  preserveMissing = false,
  presentation = false,
  fallback,
}: {
  mappingAction?: ReactNode;
  preserveMissing?: boolean;
  presentation?: boolean;
  fallback?: Href;
  save: (input: Prescription) => void;
  pending: boolean;
  error: unknown;
  exercise: ExerciseDto;
  initial?: Omit<Partial<Prescription>, 'loadMode' | 'targetSets'> & {
    loadMode?: Prescription['loadMode'] | null;
    targetSets?: number | null;
  };
}) {
  const { t, i18n } = useTranslation('programs'),
    locale = i18n.resolvedLanguage === 'it' ? 'it' : 'en';
  const initialNumber = (value: number | null | undefined, fallback: number) =>
    preserveMissing ? String(value ?? '') : String(value ?? fallback);
  const [mode, setMode] = useState<Prescription['loadMode'] | ''>(
      initial
        ? (initial.loadMode ?? '')
        : (exercise.defaultLoadMode ?? 'bodyweight'),
    ),
    [sets, setSets] = useState(initialNumber(initial?.targetSets, 3)),
    [kind, setKind] = useState<'fixed' | 'range'>(
      initial?.targetRepMin != null ? 'range' : 'fixed',
    ),
    [reps, setReps] = useState(initialNumber(initial?.targetReps, 8)),
    [min, setMin] = useState(initialNumber(initial?.targetRepMin, 8)),
    [max, setMax] = useState(initialNumber(initial?.targetRepMax, 12)),
    [duration, setDuration] = useState(
      initialNumber(initial?.targetDurationSeconds, 60),
    ),
    [weight, setWeight] = useState(
      decimalDisplay(
        initial?.targetLoadKg ?? initial?.targetAssistanceKg,
        locale,
      ),
    ),
    [rpeValue, setRpe] = useState(decimalDisplay(initial?.targetRpe, locale)),
    [rest, setRest] = useState(initial?.restSeconds?.toString() ?? ''),
    [notes, setNotes] = useState(initial?.notes ?? ''),
    [invalid, setInvalid] = useState(false);
  const integerControl = (
    label: string,
    value: string,
    update: (value: string) => void,
    bounds = { min: 0, max: 1_000_000, step: 1, initial: 8 },
  ) => (
    <NumberControl
      label={label}
      value={value}
      onChange={update}
      min={bounds.min}
      max={bounds.max}
      onStep={(direction) => {
        try {
          update(stepInteger(value, direction, bounds));
          setInvalid(false);
        } catch {
          setInvalid(true);
        }
      }}
    />
  );
  const decimalControl = (
    label: string,
    value: string,
    update: (value: string) => void,
    scale: 1 | 2,
  ) => (
    <NumberControl
      label={label}
      value={value}
      onChange={update}
      prefix={scale === 2 && mode === 'weighted' ? '+' : ''}
      unit={scale === 2 ? t('kgUnit') : ''}
      presetsFirst={scale === 1}
      keyboardType="decimal-pad"
      min={scale === 1 ? 1 : 0}
      max={scale === 1 ? 10 : 9999999.99}
      hint={t(scale === 1 ? 'rpeHint' : 'weightHint')}
      presets={
        scale === 1
          ? [
              {
                value: '',
                label: t('noRpeShort'),
                accessibilityLabel: t('noRpe'),
              },
              ...[7, 7.5, 8, 8.5, 9, 9.5, 10].map((n) => ({
                value: decimalDisplay(String(n), locale),
                label: decimalDisplay(String(n), locale),
                accessibilityLabel: `RPE ${decimalDisplay(String(n), locale)}`,
              })),
            ]
          : []
      }
      onStep={(direction) => {
        try {
          const base = value.trim()
            ? decimalInput(value, scale)
            : scale === 1
              ? '7.5'
              : '0.00';
          update(
            decimalDisplay(
              stepDecimal(base, scale === 1 ? '0.5' : '2.50', direction, scale),
              locale,
            ),
          );
          setInvalid(false);
        } catch {
          setInvalid(true);
        }
      }}
    />
  );
  const submit = () => {
    if (pending) return;
    try {
      const input = prescriptionFor(exercise.trackingMode).parse({
        exerciseId: exercise.id,
        loadMode: mode,
        targetSets: integerInput(sets),
        targetReps:
          exercise.trackingMode === 'reps' && kind === 'fixed'
            ? integerInput(reps)
            : null,
        targetRepMin:
          exercise.trackingMode === 'reps' && kind === 'range'
            ? integerInput(min)
            : null,
        targetRepMax:
          exercise.trackingMode === 'reps' && kind === 'range'
            ? integerInput(max)
            : null,
        targetDurationSeconds:
          exercise.trackingMode === 'duration' ? integerInput(duration) : null,
        targetLoadKg:
          mode && loadFields(mode).load && weight.trim()
            ? decimalInput(weight, 2)
            : null,
        targetAssistanceKg:
          mode && loadFields(mode).assistance && weight.trim()
            ? decimalInput(weight, 2)
            : null,
        targetRpe: rpeValue.trim() ? decimalInput(rpeValue, 1) : null,
        restSeconds: rest.trim() ? integerInput(rest) : null,
        notes: notes.trim() || null,
      });
      setInvalid(false);
      save(input);
    } catch {
      setInvalid(true);
    }
  };
  const SaveButton = presentation ? ProgramButton : Button;
  return (
    <FormScreen
      presentation={presentation}
      {...(fallback ? { fallback } : {})}
      background="structure"
      invalid={invalid}
      footer={
        <SaveButton
          label={t(initial ? 'saveChanges' : 'saveExercise')}
          busy={pending}
          onPress={submit}
        />
      }
    >
      {presentation ? (
        <>
          <FormHeader title={t(initial ? 'editExercise' : 'addExercise')} />
          <Field
            label={t('exerciseName')}
            value={exercise.displayName}
            editable={false}
          />
          {mappingAction}
          {integerControl(t('sets'), sets, setSets, {
            min: 1,
            max: 100,
            step: 1,
            initial: 3,
          })}
          {exercise.trackingMode === 'duration' ? (
            integerControl(t('duration'), duration, setDuration, {
              min: 1,
              max: 86400,
              step: 15,
              initial: 60,
            })
          ) : (
            <>
              <Text variant="label" color={programInk.charcoal}>
                {t('repsType')}
              </Text>
              <View style={choiceStyles.row}>
                <Choice
                  label={t('range')}
                  selected={kind === 'range'}
                  onPress={() => setKind('range')}
                />
                <Choice
                  label={t('fixed')}
                  selected={kind === 'fixed'}
                  onPress={() => setKind('fixed')}
                />
              </View>
              {kind === 'fixed' ? (
                integerControl(t('reps'), reps, setReps)
              ) : (
                <>
                  {integerControl(t('repMin'), min, setMin)}
                  {integerControl(t('repMax'), max, setMax)}
                </>
              )}
            </>
          )}
          <Text variant="label" color={programInk.charcoal}>
            {t('mode')}
          </Text>
          <View style={choiceStyles.row}>
            {loadModes.map((value) => (
              <Choice
                key={value}
                label={t(`loadModes.${value}`)}
                selected={mode === value}
                onPress={() => {
                  if (value !== mode) {
                    setMode(value);
                    setWeight('');
                  }
                }}
              />
            ))}
          </View>
          {mode === 'weighted' ? (
            <Text variant="caption" color={programInk.secondary}>
              {t('weightedHint')}
            </Text>
          ) : null}
          {mode === 'assisted' ? (
            <Text variant="caption" color={programInk.secondary}>
              {t('assistedHint')}
            </Text>
          ) : null}
          {mode && mode !== 'bodyweight'
            ? decimalControl(
                t(
                  mode === 'weighted'
                    ? 'addedLoad'
                    : mode === 'assisted'
                      ? 'assistance'
                      : 'load',
                ),
                weight,
                setWeight,
                2,
              )
            : null}
          <NumberControl
            label={t('rest')}
            displayLabel={t('restShort')}
            value={rest}
            onChange={setRest}
            min={0}
            max={86400}
            unit={t('secondsShort')}
            manualLabel={t('customRest')}
            onStep={(direction) => {
              try {
                setRest(
                  stepInteger(rest, direction, {
                    min: 0,
                    max: 86400,
                    step: 30,
                    initial: 60,
                  }),
                );
                setInvalid(false);
              } catch {
                setInvalid(true);
              }
            }}
            presets={[
              { value: '', label: t('unspecified') },
              ...[30, 60, 90, 120, 180].map((seconds) => ({
                value: String(seconds),
                label:
                  seconds < 120
                    ? `${seconds} ${t('secondsShort')}`
                    : `${seconds / 60}:00`,
              })),
            ]}
          />
          {decimalControl(t('rpe'), rpeValue, setRpe, 1)}
          <Field
            label={t('notes')}
            value={notes}
            onChangeText={setNotes}
            multiline
            maxLength={2000}
            placeholder={t('notesPlaceholder')}
          />
        </>
      ) : (
        <>
          <FormHeader
            title={exercise.displayName}
            subtitle={t('exerciseSubtitle')}
          />
          {mappingAction}
          <FormSection>
            <Text variant="label">{t('mode')}</Text>
            <View style={choiceStyles.row}>
              {loadModes.map((value) => (
                <Choice
                  key={value}
                  label={t(`loadModes.${value}`)}
                  selected={mode === value}
                  onPress={() => {
                    if (value !== mode) {
                      setMode(value);
                      setWeight('');
                    }
                  }}
                />
              ))}
            </View>
            {mode === 'weighted' ? (
              <Text variant="caption" color={colors.secondary}>
                {t('weightedHint')}
              </Text>
            ) : null}
            {mode === 'assisted' ? (
              <Text variant="caption" color={colors.secondary}>
                {t('assistedHint')}
              </Text>
            ) : null}
            {mode && mode !== 'bodyweight'
              ? decimalControl(
                  t(
                    mode === 'weighted'
                      ? 'addedLoad'
                      : mode === 'assisted'
                        ? 'assistance'
                        : 'load',
                  ),
                  weight,
                  setWeight,
                  2,
                )
              : null}
          </FormSection>
          <FormSection>
            <Text variant="label" color={colors.secondary}>
              {t('volume')}
            </Text>
            {integerControl(t('sets'), sets, setSets, {
              min: 1,
              max: 100,
              step: 1,
              initial: 3,
            })}
            {exercise.trackingMode === 'duration' ? (
              integerControl(t('duration'), duration, setDuration, {
                min: 1,
                max: 86400,
                step: 15,
                initial: 60,
              })
            ) : (
              <>
                <Text variant="label">{t('repsType')}</Text>
                <View style={choiceStyles.row}>
                  <Choice
                    label={t('fixed')}
                    selected={kind === 'fixed'}
                    onPress={() => setKind('fixed')}
                  />
                  <Choice
                    label={t('range')}
                    selected={kind === 'range'}
                    onPress={() => setKind('range')}
                  />
                </View>
                {kind === 'fixed' ? (
                  integerControl(t('reps'), reps, setReps)
                ) : (
                  <>
                    {integerControl(t('repMin'), min, setMin)}
                    {integerControl(t('repMax'), max, setMax)}
                  </>
                )}
              </>
            )}
          </FormSection>
          <FormSection>
            <Text variant="label" color={colors.secondary}>
              {t('intensity')}
            </Text>
            {decimalControl(t('rpe'), rpeValue, setRpe, 1)}
          </FormSection>
          <FormSection>
            <Text variant="label" color={colors.secondary}>
              {t('recovery')}
            </Text>
            <NumberControl
              label={t('rest')}
              value={rest}
              onChange={setRest}
              min={0}
              max={86400}
              hint={t('restHint')}
              presetsFirst
              unit={t('secondsShort')}
              manualLabel={t('customRest')}
              onStep={(direction) => {
                try {
                  setRest(
                    stepInteger(rest, direction, {
                      min: 0,
                      max: 86400,
                      step: 30,
                      initial: 60,
                    }),
                  );
                  setInvalid(false);
                } catch {
                  setInvalid(true);
                }
              }}
              presets={[
                { value: '', label: t('unspecified') },
                ...[30, 60, 90, 120, 180].map((seconds) => ({
                  value: String(seconds),
                  label:
                    seconds < 120
                      ? `${seconds} ${t('secondsShort')}`
                      : `${seconds / 60}:00`,
                })),
              ]}
            />
            <Field
              label={t('notes')}
              value={notes}
              onChangeText={setNotes}
              multiline
              maxLength={2000}
              placeholder={t('notesPlaceholder')}
            />
          </FormSection>
        </>
      )}
      {error ? <ErrorNotice error={error} /> : null}
    </FormScreen>
  );
}
