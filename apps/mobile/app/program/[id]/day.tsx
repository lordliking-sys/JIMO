import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { dayInputSchema, type DayDto, type DayInput } from '@jimo/schemas';
import { Screen, Text, Button } from '@jimo/ui';
import {
  useProgram,
  useProgramMutation,
  useApiLocale,
} from '../../../src/api/queries';
import { programsApi } from '../../../src/api/programs';
import {
  Back,
  Field,
  ErrorNotice,
  QueryState,
} from '../../../src/programs/components';
import { integerInput } from '../../../src/programs/helpers';
import { ApiClientError } from '../../../src/api/client';
function Form({ id, day }: { id: string; day?: DayDto }) {
  const { t } = useTranslation('programs'),
    router = useRouter(),
    locale = useApiLocale();
  const [name, setName] = useState(day?.name ?? ''),
    [weekday, setWeekday] = useState(day?.dayOfWeek?.toString() ?? ''),
    [notes, setNotes] = useState(day?.notes ?? ''),
    [invalid, setInvalid] = useState(false);
  const mutation = useProgramMutation((input: DayInput) =>
    programsApi.saveDay(id, day?.id, input, locale),
  );
  return (
    <Screen>
      <Back />
      <Text variant="h1">{t(day ? 'editDay' : 'addDay')}</Text>
      <Field
        label={t('dayName')}
        value={name}
        onChangeText={setName}
        maxLength={160}
      />
      <Field
        label={t('weekday')}
        value={weekday}
        onChangeText={setWeekday}
        keyboardType="number-pad"
      />
      <Text>{t('weekdayHint')}</Text>
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
        label={t('saveDay')}
        busy={mutation.isPending}
        onPress={() => {
          if (mutation.isPending) return;
          try {
            const input = dayInputSchema.parse({
              name,
              dayOfWeek: weekday.trim() ? integerInput(weekday) : null,
              notes: notes.trim() || null,
            });
            setInvalid(false);
            mutation.mutate(input, { onSuccess: () => router.back() });
          } catch {
            setInvalid(true);
          }
        }}
      />
    </Screen>
  );
}
export default function Day() {
  const { id, dayId } = useLocalSearchParams<{ id: string; dayId?: string }>(),
    query = useProgram(id);
  if (!query.data)
    return (
      <QueryState
        pending={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
      />
    );
  const day = query.data.days.find((d) => d.id === dayId);
  if (dayId && !day)
    return (
      <QueryState
        pending={false}
        error={new ApiClientError('NOT_FOUND', 404)}
        retry={() => void query.refetch()}
      />
    );
  return <Form id={id} {...(day ? { day } : {})} />;
}
