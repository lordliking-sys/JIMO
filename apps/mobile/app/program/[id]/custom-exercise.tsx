import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  customExerciseInputSchema,
  loadModes,
  trackingModes,
} from '@jimo/schemas';
import { Screen, Text, Button } from '@jimo/ui';
import { exercisesApi } from '../../../src/api/exercises';
import { useApiLocale } from '../../../src/api/queries';
import { Back, Field, ErrorNotice } from '../../../src/programs/components';
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
    <Screen>
      <Back />
      <Text variant="h1">{t('createCustom')}</Text>
      <Field
        label={t('exerciseName')}
        value={name}
        onChangeText={setName}
        maxLength={160}
      />
      <Text variant="label">{t('tracking')}</Text>
      {trackingModes.map((v) => (
        <Button
          key={v}
          variant={tracking === v ? 'primary' : 'secondary'}
          label={t(`trackingModes.${v}`)}
          onPress={() => setTracking(v)}
        />
      ))}
      <Text variant="label">{t('defaultLoad')}</Text>
      <Button
        label={t('none')}
        variant={mode === null ? 'primary' : 'secondary'}
        onPress={() => setMode(null)}
      />
      {loadModes.map((v) => (
        <Button
          key={v}
          label={t(`loadModes.${v}`)}
          variant={mode === v ? 'primary' : 'secondary'}
          onPress={() => setMode(v)}
        />
      ))}
      {invalid ? (
        <Text accessibilityRole="alert">{t('invalidForm')}</Text>
      ) : null}
      {mutation.error ? <ErrorNotice error={mutation.error} /> : null}
      <Button
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
    </Screen>
  );
}
