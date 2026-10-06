import { useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  prescriptionFor,
  loadModes,
  type Prescription,
  type ExerciseDto,
  type ProgramExerciseDto,
} from '@jimo/schemas';
import { Text, Button, Card, colors } from '@jimo/ui';
import {
  useProgram,
  useExercise,
  useProgramMutation,
  useApiLocale,
} from '../../../src/api/queries';
import { programsApi } from '../../../src/api/programs';
import { ApiClientError } from '../../../src/api/client';
import {
  Back,
  Field,
  ErrorNotice,
  QueryState,
  FormScreen,
} from '../../../src/programs/components';
import {
  integerInput,
  decimalInput,
  decimalDisplay,
  stepDecimal,
  stepInteger,
  restDisplay,
  loadFields,
} from '../../../src/programs/helpers';
import {
  NumberControl,
  Choice,
  choiceStyles,
} from '../../../src/programs/NumberControl';
import { ScreenHeader } from '../../../src/components/ScreenHeader';
function Editor({
  id,
  dayId,
  exercise,
  initial,
}: {
  id: string;
  dayId: string;
  exercise: ExerciseDto;
  initial?: ProgramExerciseDto;
}) {
  const { t } = useTranslation('programs'),
    router = useRouter(),
    locale = useApiLocale();
  const [mode, setMode] = useState(
      initial?.loadMode ?? exercise.defaultLoadMode ?? 'bodyweight',
    ),
    [sets, setSets] = useState(String(initial?.targetSets ?? 3)),
    [kind, setKind] = useState<'fixed' | 'range'>(
      initial?.targetRepMin != null ? 'range' : 'fixed',
    ),
    [reps, setReps] = useState(String(initial?.targetReps ?? 8)),
    [min, setMin] = useState(String(initial?.targetRepMin ?? 8)),
    [max, setMax] = useState(String(initial?.targetRepMax ?? 12)),
    [duration, setDuration] = useState(
      String(initial?.targetDurationSeconds ?? 60),
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
  const mutation = useProgramMutation((input: Prescription) =>
    programsApi.saveExercise(dayId, initial?.id, input, locale),
  );
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
      keyboardType="decimal-pad"
      min={scale === 1 ? 1 : 0}
      max={scale === 1 ? 10 : 9999999.99}
      hint={t(scale === 1 ? 'rpeHint' : 'weightHint')}
      presets={
        scale === 1
          ? [
              { value: '', label: t('noRpe') },
              ...[7, 8, 9].map((n) => ({
                value: String(n),
                label: `RPE ${n}`,
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
    if (mutation.isPending) return;
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
          loadFields(mode).load && weight.trim()
            ? decimalInput(weight, 2)
            : null,
        targetAssistanceKg:
          loadFields(mode).assistance && weight.trim()
            ? decimalInput(weight, 2)
            : null,
        targetRpe: rpeValue.trim() ? decimalInput(rpeValue, 1) : null,
        restSeconds: rest.trim() ? integerInput(rest) : null,
        notes: notes.trim() || null,
      });
      setInvalid(false);
      mutation.mutate(input, {
        onSuccess: () =>
          router.dismissTo({ pathname: '/program/[id]', params: { id } }),
      });
    } catch {
      setInvalid(true);
    }
  };
  return (
    <FormScreen
      invalid={invalid}
      footer={
        <Button
          label={t('saveExercise')}
          busy={mutation.isPending}
          onPress={submit}
        />
      }
    >
      <Back />
      <ScreenHeader
        title={exercise.displayName}
        subtitle={t('exerciseSubtitle')}
        light
      />
      <Card>
        <Text variant="label">{t('mode')}</Text>
        <View style={choiceStyles.row}>
          {loadModes.map((value) => (
            <Choice
              key={value}
              label={t(`loadModes.${value}`)}
              selected={mode === value}
              onPress={() => {
                setMode(value);
                setWeight('');
              }}
            />
          ))}
        </View>
        {mode === 'weighted' ? (
          <Text variant="caption" color={colors.secondary}>
            {t('weightedHint')}
          </Text>
        ) : null}
      </Card>
      <Card>
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
      </Card>
      <Card>
        <Text variant="label" color={colors.secondary}>
          {t('intensity')}
        </Text>
        {mode !== 'bodyweight'
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
        {decimalControl(t('rpe'), rpeValue, setRpe, 1)}
      </Card>
      <Card>
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
              label: `${restDisplay(seconds)}${seconds < 60 ? t('secondsSuffix') : ''}`,
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
      </Card>
      {mutation.error ? <ErrorNotice error={mutation.error} /> : null}
    </FormScreen>
  );
}
export default function ExerciseEditor() {
  const { id, dayId, exerciseId, prescriptionId } = useLocalSearchParams<{
      id: string;
      dayId: string;
      exerciseId: string;
      prescriptionId?: string;
    }>(),
    query = useProgram(id),
    exercise = useExercise(exerciseId);
  if (!query.data || !exercise.data)
    return (
      <QueryState
        pending={query.isPending || exercise.isPending}
        error={query.error || exercise.error}
        retry={() => {
          void query.refetch();
          void exercise.refetch();
        }}
      />
    );
  const day = query.data.days.find((d) => d.id === dayId);
  const initial = day?.exercises.find((e) => e.id === prescriptionId);
  if (!day || (prescriptionId && !initial))
    return (
      <QueryState
        pending={false}
        error={new ApiClientError('NOT_FOUND', 404)}
        retry={() => void query.refetch()}
      />
    );
  return (
    <Editor
      id={id}
      dayId={dayId}
      exercise={exercise.data}
      {...(initial ? { initial } : {})}
    />
  );
}
