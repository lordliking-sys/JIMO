import { useState } from 'react';
import Plus from 'lucide-react-native/icons/plus';
import Minus from 'lucide-react-native/icons/minus';
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
import { Screen, Text, Button, IconButton, colors } from '@jimo/ui';
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
  styles,
} from '../../../src/programs/components';
import {
  integerInput,
  decimalInput,
  decimalDisplay,
  stepDecimal,
  restDisplay,
  loadFields,
} from '../../../src/programs/helpers';
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
    update: (v: string) => void,
  ) => (
    <View style={{ gap: 8 }}>
      <Field
        label={label}
        value={value}
        onChangeText={update}
        keyboardType="number-pad"
      />
      <View style={styles.row}>
        <IconButton
          icon={<Minus color={colors.text} />}
          label={`${t('decrease')} ${label}`}
          onPress={() => {
            try {
              update(String(Math.max(0, integerInput(value) - 1)));
            } catch {
              setInvalid(true);
            }
          }}
        />
        <IconButton
          icon={<Plus color={colors.text} />}
          label={`${t('increase')} ${label}`}
          onPress={() => {
            try {
              update(String(integerInput(value) + 1));
            } catch {
              setInvalid(true);
            }
          }}
        />
      </View>
    </View>
  );
  const decimalControl = (
    label: string,
    value: string,
    update: (v: string) => void,
    scale: 1 | 2,
  ) => (
    <View style={{ gap: 8 }}>
      <Field
        label={label}
        value={value}
        onChangeText={update}
        keyboardType="decimal-pad"
      />
      <View style={styles.row}>
        {([-1, 1] as const).map((direction) => (
          <IconButton
            key={direction}
            icon={
              direction === 1 ? (
                <Plus color={colors.text} />
              ) : (
                <Minus color={colors.text} />
              )
            }
            label={`${t(direction === 1 ? 'increase' : 'decrease')} ${label}`}
            onPress={() => {
              try {
                const base = value.trim()
                  ? decimalInput(value, scale)
                  : scale === 1
                    ? '8.0'
                    : '0.00';
                update(
                  decimalDisplay(
                    stepDecimal(
                      base,
                      scale === 1 ? '0.5' : '2.50',
                      direction,
                      scale,
                    ),
                    locale,
                  ),
                );
                setInvalid(false);
              } catch {
                setInvalid(true);
              }
            }}
          />
        ))}
      </View>
    </View>
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
    <Screen>
      <Back />
      <Text variant="h1">{exercise.displayName}</Text>
      <Text variant="label">{t('mode')}</Text>
      {loadModes.map((value) => (
        <Button
          key={value}
          label={t(`loadModes.${value}`)}
          variant={mode === value ? 'primary' : 'secondary'}
          onPress={() => {
            setMode(value);
            setWeight('');
          }}
        />
      ))}
      {mode === 'weighted' ? <Text>{t('weightedHint')}</Text> : null}
      {integerControl(t('sets'), sets, setSets)}
      {exercise.trackingMode === 'duration' ? (
        integerControl(t('duration'), duration, setDuration)
      ) : (
        <>
          <Text variant="label">{t('repsType')}</Text>
          <Button
            label={t('fixed')}
            variant={kind === 'fixed' ? 'primary' : 'secondary'}
            onPress={() => setKind('fixed')}
          />
          <Button
            label={t('range')}
            variant={kind === 'range' ? 'primary' : 'secondary'}
            onPress={() => setKind('range')}
          />
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
      <Button
        variant="secondary"
        label={t('noRpe')}
        onPress={() => setRpe('')}
      />
      <Field
        label={t('rest')}
        value={rest}
        onChangeText={setRest}
        keyboardType="number-pad"
      />
      <View style={styles.row}>
        {[30, 60, 90, 120, 180].map((seconds) => (
          <Button
            key={seconds}
            label={`${restDisplay(seconds)}${seconds < 60 ? t('secondsSuffix') : ''}`}
            variant="secondary"
            onPress={() => setRest(String(seconds))}
          />
        ))}
      </View>
      <Field
        label={t('notes')}
        value={notes}
        onChangeText={setNotes}
        multiline
        maxLength={2000}
      />
      {invalid ? (
        <Text accessibilityRole="alert">{t('invalidForm')}</Text>
      ) : null}
      {mutation.error ? <ErrorNotice error={mutation.error} /> : null}
      <Button
        label={t('saveExercise')}
        busy={mutation.isPending}
        onPress={submit}
      />
    </Screen>
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
