import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, Button, Card, colors } from '@jimo/ui';
import {
  programInputSchema,
  type ProgramInput,
  type ProgramSummary,
} from '@jimo/schemas';
import { Field, Back, ErrorNotice, FormScreen } from './components';
import { integerInput, stepInteger } from './helpers';
import { NumberControl } from './NumberControl';
import { DateField } from './DateField';
import { ScreenHeader } from '../components/ScreenHeader';
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
    <FormScreen
      invalid={invalid}
      footer={
        <Button
          label={t(initial ? 'save' : 'continue')}
          busy={pending}
          onPress={submit}
        />
      }
    >
      <Back />
      <ScreenHeader
        title={t(initial ? 'editProgram' : 'manualTitle')}
        subtitle={t('manualSubtitle')}
      />
      <Card>
        <Text variant="label" color={colors.secondary}>
          {t('programDetails')}
        </Text>
        <Field
          label={t('name')}
          value={name}
          onChangeText={setName}
          maxLength={160}
          placeholder={t('namePlaceholder')}
          autoCapitalize="sentences"
        />
        <Field
          label={t('description')}
          value={description}
          onChangeText={setDescription}
          multiline
          maxLength={2000}
          placeholder={t('descriptionPlaceholder')}
        />
      </Card>
      <Card>
        <Text variant="label" color={colors.secondary}>
          {t('schedule')}
        </Text>
        <NumberControl
          label={t('weeks')}
          value={weeks}
          onChange={setWeeks}
          min={1}
          max={520}
          hint={t('weeksHint')}
          onStep={(direction) => {
            try {
              setWeeks(
                stepInteger(weeks, direction, { min: 1, max: 520, initial: 4 }),
              );
            } catch {
              setInvalid(true);
            }
          }}
          presets={[
            { value: '', label: t('unspecified') },
            ...[4, 8, 12].map((n) => ({
              value: String(n),
              label: t('weekCount', { count: n }),
            })),
          ]}
        />
        <DateField value={starts} onChange={setStarts} />
      </Card>
      {error ? <ErrorNotice error={error} /> : null}
    </FormScreen>
  );
}
