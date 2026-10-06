import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Screen, Text, Button } from '@jimo/ui';
import {
  programInputSchema,
  type ProgramInput,
  type ProgramSummary,
} from '@jimo/schemas';
import { Field, Back, ErrorNotice } from './components';
import { integerInput } from './helpers';
export function ProgramForm({
  initial,
  save,
  pending,
  error,
}: {
  initial?: ProgramSummary;
  save: (input: ProgramInput) => void;
  pending: boolean;
  error: unknown;
}) {
  const { t } = useTranslation('programs');
  const [name, setName] = useState(initial?.name ?? ''),
    [description, setDescription] = useState(initial?.description ?? ''),
    [weeks, setWeeks] = useState(initial?.durationWeeks?.toString() ?? ''),
    [starts, setStarts] = useState(initial?.startsOn ?? ''),
    [invalid, setInvalid] = useState(false);
  const submit = () => {
    try {
      const value = programInputSchema.parse({
        name,
        description: description.trim() || null,
        durationWeeks: weeks.trim() ? integerInput(weeks) : null,
        startsOn: starts.trim() || null,
      });
      setInvalid(false);
      save(value);
    } catch {
      setInvalid(true);
    }
  };
  return (
    <Screen>
      <Back />
      <Text variant="h1">{t(initial ? 'editProgram' : 'manualTitle')}</Text>
      <Field
        label={t('name')}
        value={name}
        onChangeText={setName}
        maxLength={160}
      />
      <Field
        label={t('description')}
        value={description}
        onChangeText={setDescription}
        multiline
        maxLength={2000}
      />
      <Field
        label={t('weeks')}
        value={weeks}
        onChangeText={setWeeks}
        keyboardType="number-pad"
      />
      <Field
        label={t('startsOn')}
        value={starts}
        onChangeText={setStarts}
        placeholder={t('dateFormat')}
      />
      {invalid ? (
        <Text accessibilityRole="alert">{t('invalidForm')}</Text>
      ) : null}
      {error ? <ErrorNotice error={error} /> : null}
      <Button
        label={t(initial ? 'save' : 'continue')}
        busy={pending}
        onPress={submit}
      />
    </Screen>
  );
}
