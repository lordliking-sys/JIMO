import { useState } from 'react';
import { View } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Button, Text, spacing } from '@jimo/ui';
import { dayInputSchema } from '@jimo/schemas';
import { Field, FormScreen, FormHeader } from '../../src/programs/components';
import { Choice, choiceStyles } from '../../src/programs/NumberControl';
import { useImportDraft } from '../../src/imports/Provider';
function DayEditor({ dayId }: { dayId: string }) {
  const review = useImportDraft(),
    router = useRouter(),
    { t } = useTranslation('imports'),
    { t: p } = useTranslation('programs');
  const day = review.draft?.days.find((d) => d.localId === dayId);
  const [name, setName] = useState(day?.name ?? ''),
    [weekday, setWeekday] = useState<number | null>(day?.dayOfWeek ?? null),
    [notes, setNotes] = useState(day?.notes ?? ''),
    [invalid, setInvalid] = useState(false),
    [busy, setBusy] = useState(false);
  const save = async () => {
    if (busy || !day) return;
    const input = dayInputSchema.safeParse({
      name,
      dayOfWeek: weekday,
      notes: notes || null,
    });
    if (!input.success) {
      setInvalid(true);
      return;
    }
    setBusy(true);
    try {
      await review.update((d) => ({
        ...d!,
        days: d!.days.map((v) =>
          v.localId === dayId ? { ...v, ...input.data } : v,
        ),
      }));
      router.back();
    } catch {
      setInvalid(true);
    } finally {
      setBusy(false);
    }
  };
  return (
    <FormScreen
      invalid={invalid}
      footer={
        <Button label={t('save')} busy={busy} onPress={() => void save()} />
      }
    >
      <FormHeader title={t('editDay')} />
      <Field
        label={p('dayName')}
        value={name}
        onChangeText={setName}
        maxLength={160}
      />
      <View style={{ gap: spacing.sm }}>
        <Text variant="label">{p('weekday')}</Text>
        <View style={choiceStyles.row}>
          <Choice
            label={p('unspecified')}
            selected={weekday === null}
            onPress={() => setWeekday(null)}
          />
          {([1, 2, 3, 4, 5, 6, 7] as const).map((n) => (
            <Choice
              key={n}
              label={p(`weekdays.${n}`)}
              selected={weekday === n}
              onPress={() => setWeekday(n)}
            />
          ))}
        </View>
      </View>
      <Field
        label={p('notes')}
        value={notes}
        onChangeText={setNotes}
        multiline
        maxLength={2000}
      />
      <Button
        label={t('removeDay')}
        variant="text"
        disabled={busy}
        onPress={() =>
          void review
            .update((d) => ({
              ...d!,
              days: d!.days.filter((v) => v.localId !== dayId),
            }))
            .then(() => router.back())
            .catch(() => setInvalid(true))
        }
      />
    </FormScreen>
  );
}
export default function ImportDay() {
  const { dayId } = useLocalSearchParams<{ dayId: string }>(),
    review = useImportDraft();
  return review.loaded ? <DayEditor key={dayId} dayId={dayId} /> : null;
}
