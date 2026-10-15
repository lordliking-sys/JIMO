import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { dayInputSchema, type DayDto, type DayInput } from '@jimo/schemas';
import { Text } from '@jimo/ui';
import { ProgramButton, programInk } from '../programs/presentation';
import { useProgramMutation, useApiLocale } from '../api/queries';
import { programsApi } from '../api/programs';
import {
  FormHeader,
  Field,
  ErrorNotice,
  FormScreen,
  FormSection,
} from '../programs/components';
import { weekdayNumbers, weekdayValue } from '../programs/weekdays';
import { View } from 'react-native';
import { Choice, choiceStyles } from '../programs/NumberControl';
export function DayEditor({
  id,
  day,
  onSaved,
  weekday,
}: {
  id: string;
  day?: DayDto;
  onSaved(): void;
  weekday?: number;
}) {
  const { t } = useTranslation('programs'),
    locale = useApiLocale();
  const [name, setName] = useState(day?.name ?? ''),
    [selectedWeekday, setWeekday] = useState(
      (day?.dayOfWeek ?? weekday)?.toString() ?? '',
    ),
    [notes, setNotes] = useState(day?.notes ?? ''),
    [invalid, setInvalid] = useState(false);
  const mutation = useProgramMutation((input: DayInput) =>
    programsApi.saveDay(id, day?.id, input, locale),
  );
  return (
    <FormScreen
      header={<FormHeader title={t(day ? 'editDay' : 'newDay')} />}
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
                dayOfWeek: weekdayValue(selectedWeekday),
                notes: notes.trim() || null,
              });
              setInvalid(false);
              mutation.mutate(input, {
                onSuccess: onSaved,
              });
            } catch {
              setInvalid(true);
            }
          }}
        />
      }
    >
      <FormSection>
        <Field
          label={t('dayName')}
          value={name}
          onChangeText={setName}
          maxLength={160}
          placeholder={t('dayPlaceholder')}
          {...(invalid && !name.trim() ? { error: t('requiredName') } : {})}
        />
        <Text variant="label" color={programInk.text}>
          {t('weekday')}
        </Text>
        <View style={choiceStyles.row}>
          {weekdayNumbers.map((number) => (
            <Choice
              key={number}
              label={t(`weekdaysShort.${number}`)}
              accessibilityLabel={t(`weekdays.${number}`)}
              selected={selectedWeekday === String(number)}
              onPress={() => setWeekday(String(number))}
            />
          ))}
          <Choice
            label={t('noWeekday')}
            selected={!selectedWeekday}
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
