import { View } from 'react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { spacing } from '@jimo/ui';
import {
  programInputSchema,
  type ProgramInput,
  type ProgramSummary,
} from '@jimo/schemas';
import { Field, FormHeader, ErrorNotice, FormScreen } from './components';
import { integerInput, stepInteger } from './helpers';
import { NumberControl } from './NumberControl';
import { calendarDateLabel } from './date';
import { DateField } from './DateField';
import { ProgramButton } from './presentation';
import type { ReactNode } from 'react';
import type { Href } from 'expo-router';
export function ProgramForm({
  initial,
  save,
  pending,
  error,
  actions,
  fallback,
  children,
  submitLabel,
}: {
  initial?: ProgramSummary;
  save: (input: ProgramInput) => void;
  pending: boolean;
  error: unknown;
  actions?: ReactNode;
  fallback?: Href;
  children?: ReactNode;
  submitLabel?: string;
}) {
  const { t, i18n } = useTranslation('programs');
  const [name, setName] = useState(initial?.name ?? ''),
    [description, setDescription] = useState(initial?.description ?? ''),
    [weeks, setWeeks] = useState(
      initial ? (initial.durationWeeks?.toString() ?? '') : '4',
    ),
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
      header={
        <FormHeader
          title={t(initial ? 'editProgram' : 'create')}
          subtitle={[
            name,
            weeks ? t('weekCount', { count: Number(weeks) }) : '',
            starts ? calendarDateLabel(starts, i18n.language) : '',
          ]
            .filter(Boolean)
            .join(' · ')}
        />
      }
      presentation
      {...(fallback ? { fallback } : {})}
      invalid={invalid}
      footer={
        <ProgramButton
          label={submitLabel ?? t(initial ? 'save' : 'continue')}
          busy={pending}
          onPress={submit}
        />
      }
    >
      <View
        style={{
          gap: spacing.lg,
        }}
      >
        <Field
          label={t('name')}
          value={name}
          onChangeText={(value) => {
            setName(value);
            setInvalid(false);
          }}
          maxLength={160}
          placeholder={t('namePlaceholder')}
          autoCapitalize="sentences"
          {...(invalid && !name.trim() ? { error: t('requiredName') } : {})}
        />
        <Field
          label={t('description')}
          value={description}
          onChangeText={(value) => {
            setDescription(value);
            setInvalid(false);
          }}
          multiline
          maxLength={2000}
          placeholder={t('descriptionPlaceholder')}
        />
      </View>
      <View
        style={{
          gap: spacing.lg,
        }}
      >
        <NumberControl
          label={t('weeks')}
          displayLabel={t('durationShort')}
          fillRow
          value={weeks}
          onChange={(value) => {
            setWeeks(value);
            setInvalid(false);
          }}
          min={1}
          max={520}
          hint={t('weeksHint')}
          onStep={(direction) => {
            try {
              setInvalid(false);
              setWeeks(
                stepInteger(weeks, direction, { min: 1, max: 520, initial: 4 }),
              );
            } catch {
              setInvalid(true);
            }
          }}
        />
        <DateField
          value={starts}
          onChange={(value) => {
            setStarts(value);
            setInvalid(false);
          }}
        />
      </View>
      {children}
      {actions}
      {error ? <ErrorNotice error={error} /> : null}
    </FormScreen>
  );
}
