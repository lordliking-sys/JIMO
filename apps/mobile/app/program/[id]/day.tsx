import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { dayInputSchema, type DayDto, type DayInput } from '@jimo/schemas';
import { Text } from '@jimo/ui';
import { ProgramButton, programInk } from '../../../src/programs/presentation';
import {
  useProgram,
  useProgramMutation,
  useApiLocale,
} from '../../../src/api/queries';
import { programsApi } from '../../../src/api/programs';
import {
  FormHeader,
  Field,
  ErrorNotice,
  QueryState,
  FormScreen,
  FormSection,
} from '../../../src/programs/components';
import { weekdayNumbers, weekdayValue } from '../../../src/programs/weekdays';
import { ApiClientError } from '../../../src/api/client';
import { View } from 'react-native';
import { Choice, choiceStyles } from '../../../src/programs/NumberControl';
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
      presentation
      background="structure"
      fallback={{ pathname: '/program/[id]', params: { id } }}
      footer={
        <ProgramButton
          label={t('saveDay')}
          busy={mutation.isPending}
          onPress={() => {
            if (mutation.isPending) return;
            try {
              const input = dayInputSchema.parse({
                name,
                dayOfWeek: weekdayValue(weekday),
                notes: notes.trim() || null,
              });
              setInvalid(false);
              mutation.mutate(input, {
                onSuccess: () =>
                  router.canGoBack()
                    ? router.back()
                    : router.replace({
                        pathname: '/program/[id]',
                        params: { id },
                      }),
              });
            } catch {
              setInvalid(true);
            }
          }}
        />
      }
    >
      <FormHeader title={t(day ? 'editDay' : 'newDay')} />
      <FormSection>
        <Field
          label={t('dayName')}
          value={name}
          onChangeText={setName}
          maxLength={160}
          placeholder={t('dayPlaceholder')}
          {...(invalid && !name.trim() ? { error: t('requiredName') } : {})}
        />
        <Text variant="label" color={programInk.charcoal}>
          {t('weekday')}
        </Text>
        <View style={choiceStyles.row}>
          {weekdayNumbers.map((number) => (
            <Choice
              key={number}
              label={t(`weekdaysShort.${number}`)}
              accessibilityLabel={t(`weekdays.${number}`)}
              selected={weekday === String(number)}
              onPress={() => setWeekday(String(number))}
            />
          ))}
          <Choice
            label={t('noWeekday')}
            selected={!weekday}
            onPress={() => setWeekday('')}
          />
        </View>
        <Text variant="caption" color={programInk.secondary}>
          {t('weekdayOptional')}
        </Text>
        <Field
          label={t('notes')}
          value={notes}
          onChangeText={setNotes}
          multiline
          maxLength={2000}
        />
      </FormSection>
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
        presentation
        pending={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
      />
    );
  const day = query.data.days.find((d) => d.id === dayId);
  if (dayId && !day)
    return (
      <QueryState
        presentation
        pending={false}
        error={new ApiClientError('NOT_FOUND', 404)}
        retry={() => void query.refetch()}
      />
    );
  return <Form id={id} {...(day ? { day } : {})} />;
}
