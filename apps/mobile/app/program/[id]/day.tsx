import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { dayInputSchema, type DayDto, type DayInput } from '@jimo/schemas';
import { Button, Card } from '@jimo/ui';
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
  FormScreen,
} from '../../../src/programs/components';
import { integerInput, stepInteger } from '../../../src/programs/helpers';
import { ApiClientError } from '../../../src/api/client';
import { NumberControl } from '../../../src/programs/NumberControl';
import { ScreenHeader } from '../../../src/components/ScreenHeader';
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
    <FormScreen
      invalid={invalid}
      footer={
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
      }
    >
      <Back />
      <ScreenHeader title={t(day ? 'editDay' : 'addDay')} light />
      <Card>
        <Field
          label={t('dayName')}
          value={name}
          onChangeText={setName}
          maxLength={160}
          placeholder={t('dayPlaceholder')}
        />
        <NumberControl
          label={t('weekday')}
          value={weekday}
          onChange={setWeekday}
          min={1}
          max={7}
          hint={
            /^[1-7]$/.test(weekday)
              ? t(`weekdays.${weekday as '1'}`)
              : t('weekdayHint')
          }
          presets={[{ value: '', label: t('unspecified') }]}
          onStep={(direction) => {
            try {
              setWeekday(stepInteger(weekday, direction, { min: 1, max: 7 }));
            } catch {
              setInvalid(true);
            }
          }}
        />
        <Field
          label={t('notes')}
          value={notes}
          onChangeText={setNotes}
          multiline
          maxLength={2000}
        />
      </Card>
      {mutation.error ? <ErrorNotice error={mutation.error} /> : null}
    </FormScreen>
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
