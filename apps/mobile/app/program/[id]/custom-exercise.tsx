import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  customExerciseInputSchema,
  loadModes,
  trackingModes,
} from '@jimo/schemas';
import { Text } from '@jimo/ui';
import { ProgramButton, programInk } from '../../../src/programs/presentation';
import { exercisesApi } from '../../../src/api/exercises';
import { useApiLocale } from '../../../src/api/queries';
import {
  FormHeader,
  Field,
  ErrorNotice,
  FormScreen,
  FormSection,
} from '../../../src/programs/components';
import { Choice, choiceStyles } from '../../../src/programs/NumberControl';
import { View } from 'react-native';
export default function CustomExercise() {
  const { id, dayId } = useLocalSearchParams<{ id: string; dayId: string }>(),
    router = useRouter(),
    { t } = useTranslation('programs'),
    locale = useApiLocale(),
    cache = useQueryClient();
  const [name, setName] = useState(''),
    [tracking, setTracking] = useState<(typeof trackingModes)[number]>('reps'),
    [mode, setMode] = useState<(typeof loadModes)[number] | null>(null),
    [invalid, setInvalid] = useState(false);
  const submitting = useRef(false);
  const mutation = useMutation({
    onSettled: () => {
      submitting.current = false;
    },
    mutationFn: () =>
      exercisesApi.create(
        customExerciseInputSchema.parse({
          name,
          trackingMode: tracking,
          defaultLoadMode: mode,
        }),
        locale,
      ),
    onSuccess: async (e) => {
      await cache.invalidateQueries({ queryKey: ['exercises'] });
      router.replace({
        pathname: '/program/[id]/exercise',
        params: { id, dayId, exerciseId: e.id },
      });
    },
  });
  return (
    <FormScreen
      presentation
      background="custom"
      invalid={invalid}
      footer={
        <ProgramButton
          label={t('saveCustom')}
          busy={mutation.isPending}
          onPress={() => {
            if (submitting.current) return;
            const valid = customExerciseInputSchema.safeParse({
              name,
              trackingMode: tracking,
              defaultLoadMode: mode,
            });
            setInvalid(!valid.success);
            if (valid.success) {
              submitting.current = true;
              mutation.mutate();
            }
          }}
        />
      }
    >
      <FormHeader title={t('customTitle')} />
      <FormSection>
        <Field
          label={t('exerciseName')}
          value={name}
          onChangeText={setName}
          maxLength={160}
          {...(invalid && !name.trim() ? { error: t('requiredName') } : {})}
        />
        <Text variant="label" color={programInk.charcoal}>
          {t('tracking')}
        </Text>
        <View style={choiceStyles.row}>
          {trackingModes.map((v) => (
            <Choice
              key={v}
              label={t(`trackingModes.${v}`)}
              selected={tracking === v}
              onPress={() => setTracking(v)}
            />
          ))}
        </View>
        <Text variant="label" color={programInk.charcoal}>
          {t('defaultLoad')}
        </Text>
        <View style={choiceStyles.row}>
          <Choice
            label={t('none')}
            selected={mode === null}
            onPress={() => setMode(null)}
          />
          {loadModes.map((v) => (
            <Choice
              key={v}
              label={t(`loadModes.${v}`)}
              selected={mode === v}
              onPress={() => setMode(v)}
            />
          ))}
        </View>
      </FormSection>
      {mutation.error ? <ErrorNotice error={mutation.error} /> : null}
    </FormScreen>
  );
}
