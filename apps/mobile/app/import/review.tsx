import { weekdayNumbers } from '../../src/programs/weekdays';
import {
  decimalDisplay,
  restDisplay,
  stepInteger,
} from '../../src/programs/helpers';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { randomUUID } from 'expo-crypto';
import { Button, Screen, Text, colors, spacing } from '@jimo/ui';
import { programDetailSchema } from '@jimo/schemas';
import { Back, Field } from '../../src/programs/components';
import { NumberControl } from '../../src/programs/NumberControl';
import { DateField } from '../../src/programs/DateField';
import { useOffline } from '../../src/db/Provider';
import { useImportDraft } from '../../src/imports/Provider';
import { draftConfirmation, incompleteItem } from '../../src/imports/draft';
import { apiRequest } from '../../src/api/client';
import { queryClient } from '../../src/api/queries';
import { importErrorKey, type ImportErrorKey } from '../../src/imports/errors';
export default function ImportReviewScreen() {
  const review = useImportDraft(),
    { runtime } = useOffline(),
    { t, i18n } = useTranslation('imports'),
    { t: p } = useTranslation('programs'),
    router = useRouter();
  const [error, setError] = useState<ImportErrorKey | null>(null),
    [busy, setBusy] = useState(false),
    lock = useRef(false);
  const live = useRef(true);
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
    };
  }, []);
  const draft = review.draft;
  const change = (action: Parameters<typeof review.update>[0]) =>
    void review.update(action).catch(() => setError('errors.storage'));
  const confirm = async () => {
    if (!draft || lock.current || !runtime.owner) return;
    let input;
    try {
      input = draftConfirmation(draft);
    } catch {
      setError('errors.review');
      return;
    }
    lock.current = true;
    setBusy(true);
    setError(null);
    const owner = runtime.owner;
    try {
      const program = await apiRequest(
        '/imports/workout-plan/confirm',
        programDetailSchema,
        {
          method: 'POST',
          body: input,
          locale: i18n.resolvedLanguage === 'it' ? 'it' : 'en',
          expectedUserId: owner,
          timeoutMs: 60_000,
        },
      );
      if (runtime.owner !== owner || !live.current) return;
      await review.discard();
      await queryClient.invalidateQueries({ queryKey: ['programs'] });
      router.dismissTo({
        pathname: '/program/[id]',
        params: { id: program.id },
      });
    } catch (e) {
      if (live.current) setError(importErrorKey(e));
    } finally {
      lock.current = false;
      if (live.current) setBusy(false);
    }
  };
  if (!review.loaded || !draft)
    return (
      <Screen>
        <Back />
        <Text>{t(review.loaded ? 'noDraft' : 'loading')}</Text>
      </Screen>
    );
  return (
    <Screen
      keyboardAware
      dismissKeyboardLabel={t('keyboardDone')}
      contentStyle={{ padding: spacing.lg, gap: spacing.lg }}
      footer={
        <View style={{ gap: spacing.sm }}>
          <Text variant="caption" color={colors.secondary}>
            {t('confirmNotice')}
          </Text>
          <Button
            label={t('create')}
            onPress={() => void confirm()}
            busy={busy}
            disabled={!runtime.online}
          />
        </View>
      }
    >
      <Back />
      <Text variant="h1" accessibilityRole="header">
        {t('title')}
      </Text>
      <Text variant="label" color={colors.secondary}>
        {t('extracted')}
      </Text>
      <Text color={colors.secondary}>{t('careful')}</Text>
      {error ? (
        <Text accessibilityRole="alert" color={colors.danger}>
          {t(error)}
        </Text>
      ) : null}
      {!runtime.online ? <Text>{t('offlineReview')}</Text> : null}
      {draft.warnings.map((warning, i) => (
        <Text key={i} variant="caption" color={colors.warning}>
          {warning}
        </Text>
      ))}
      <Field
        label={t('name')}
        value={draft.program.name}
        editable={!busy}
        maxLength={160}
        onChangeText={(name) =>
          change((d) => ({ ...d!, program: { ...d!.program, name } }))
        }
      />
      <Field
        label={t('description')}
        value={draft.program.description ?? ''}
        editable={!busy}
        maxLength={2000}
        multiline
        onChangeText={(description) =>
          change((d) => ({ ...d!, program: { ...d!.program, description } }))
        }
      />
      <NumberControl
        label={t('weeks')}
        value={draft.program.durationWeeks?.toString() ?? ''}
        min={1}
        max={520}
        onChange={(value) => {
          if (
            !value.trim() ||
            (/^\d+$/.test(value) && Number(value) >= 1 && Number(value) <= 520)
          )
            change((d) => ({
              ...d!,
              program: {
                ...d!.program,
                durationWeeks: value ? Number(value) : null,
              },
            }));
        }}
        onStep={(direction) =>
          change((d) => ({
            ...d!,
            program: {
              ...d!.program,
              durationWeeks: Number(
                stepInteger(
                  d!.program.durationWeeks?.toString() ?? '',
                  direction,
                  { min: 1, max: 520, initial: 4 },
                ),
              ),
            },
          }))
        }
      />
      <DateField
        value={draft.program.startsOn ?? ''}
        onChange={(startsOn) =>
          change((d) => ({
            ...d!,
            program: { ...d!.program, startsOn: startsOn || null },
          }))
        }
      />
      {draft.days.map((day, index) => (
        <View
          key={day.localId}
          style={{
            gap: spacing.md,
            borderTopWidth: 1,
            borderColor: colors.border,
            paddingTop: spacing.lg,
          }}
        >
          <Text variant="label" color={colors.secondary}>
            {t('day', { number: index + 1 })}
          </Text>
          <Button
            label={day.name || t('editDay')}
            variant="text"
            disabled={busy}
            onPress={() =>
              router.push({
                pathname: '/import/day',
                params: { dayId: day.localId },
              })
            }
          />
          {weekdayNumbers
            .filter((n) => n === day.dayOfWeek)
            .map((n) => (
              <Text key={n} variant="caption" color={colors.secondary}>
                {p(`weekdays.${n}`)}
              </Text>
            ))}
          {day.notes ? (
            <Text variant="caption" color={colors.secondary}>
              {day.notes}
            </Text>
          ) : null}
          {day.exercises.map((item) => (
            <View
              key={item.localId}
              style={{
                gap: spacing.xs,
                paddingVertical: spacing.md,
                borderTopWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Text variant="h3">
                {item.exercise?.displayName ??
                  item.custom?.name ??
                  item.rawName ??
                  t('unreadable')}
              </Text>
              {item.rawName &&
              (item.exercise?.displayName ??
                item.custom?.name ??
                item.rawName) !== item.rawName ? (
                <Text variant="caption" color={colors.secondary}>
                  {item.rawName}
                </Text>
              ) : null}
              {!item.exercise && !item.custom ? (
                <Text variant="caption" color={colors.warning}>
                  {t(
                    item.match.status === 'SUGGESTED'
                      ? 'suggested'
                      : 'unmatched',
                  )}
                </Text>
              ) : null}
              {item.confidence < 0.8 || incompleteItem(item) ? (
                <Text variant="caption" color={colors.warning}>
                  {t('check')}
                </Text>
              ) : null}
              <Text color={colors.secondary}>
                {item.prescription.targetSets ?? '—'} ×{' '}
                {item.prescription.targetDurationSeconds != null
                  ? `${item.prescription.targetDurationSeconds} s`
                  : item.prescription.targetRepMin != null
                    ? `${item.prescription.targetRepMin}–${item.prescription.targetRepMax ?? '—'}`
                    : (item.prescription.targetReps ?? '—')}
                {item.prescription.targetLoadKg != null
                  ? ` · ${item.prescription.loadMode === 'weighted' ? '+' : ''}${decimalDisplay(item.prescription.targetLoadKg, i18n.resolvedLanguage ?? 'en')} kg`
                  : item.prescription.targetAssistanceKg != null
                    ? ` · ${p('assistanceSummary', { value: decimalDisplay(item.prescription.targetAssistanceKg, i18n.resolvedLanguage ?? 'en'), unit: p('kgUnit') })}`
                    : ''}
              </Text>
              <Text variant="caption" color={colors.secondary}>
                {item.prescription.loadMode
                  ? p(`loadModes.${item.prescription.loadMode}`)
                  : t('loadUnknown')}{' '}
                ·{' '}
                {item.prescription.targetRpe != null
                  ? `RPE ${decimalDisplay(item.prescription.targetRpe, i18n.resolvedLanguage ?? 'en')}`
                  : 'RPE —'}{' '}
                ·{' '}
                {t('restSummary', {
                  value:
                    item.prescription.restSeconds != null
                      ? restDisplay(item.prescription.restSeconds)
                      : '—',
                })}
              </Text>
              {item.prescription.notes ? (
                <Text variant="caption" color={colors.secondary}>
                  {item.prescription.notes}
                </Text>
              ) : null}
              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: spacing.sm,
                }}
              >
                <Button
                  label={t('editExercise')}
                  variant="text"
                  disabled={busy}
                  onPress={() =>
                    router.push({
                      pathname: '/import/exercise',
                      params: { dayId: day.localId, itemId: item.localId },
                    })
                  }
                />
                <Button
                  label={t('remove')}
                  variant="text"
                  disabled={busy}
                  onPress={() =>
                    change((d) => ({
                      ...d!,
                      days: d!.days.map((v) =>
                        v.localId === day.localId
                          ? {
                              ...v,
                              exercises: v.exercises.filter(
                                (e) => e.localId !== item.localId,
                              ),
                            }
                          : v,
                      ),
                    }))
                  }
                />
              </View>
            </View>
          ))}
          <Button
            label={t('addExercise')}
            variant="text"
            disabled={
              busy ||
              day.exercises.length >= 30 ||
              draft.days.reduce((n, d) => n + d.exercises.length, 0) >= 200
            }
            onPress={() => {
              const itemId = randomUUID();
              void review
                .update((d) => ({
                  ...d!,
                  days: d!.days.map((v) =>
                    v.localId === day.localId
                      ? {
                          ...v,
                          exercises: [
                            ...v.exercises,
                            {
                              localId: itemId,
                              rawName: null,
                              confidence: 0,
                              match: {
                                status: 'UNMATCHED',
                                exercise: null,
                                suggestions: [],
                              },
                              exercise: null,
                              custom: null,
                              prescription: {
                                loadMode: null,
                                targetSets: null,
                              },
                            },
                          ],
                        }
                      : v,
                  ),
                }))
                .then(() =>
                  router.push({
                    pathname: '/import/exercise',
                    params: { dayId: day.localId, itemId },
                  }),
                )
                .catch(() => setError('errors.storage'));
            }}
          />
        </View>
      ))}
      <Button
        label={t('addDay')}
        variant="text"
        disabled={busy || draft.days.length >= 20}
        onPress={() => {
          const dayId = randomUUID();
          void review
            .update((d) => ({
              ...d!,
              days: [
                ...d!.days,
                {
                  localId: dayId,
                  name: '',
                  dayOfWeek: null,
                  notes: null,
                  exercises: [],
                },
              ],
            }))
            .then(() =>
              router.push({ pathname: '/import/day', params: { dayId } }),
            )
            .catch(() => setError('errors.storage'));
        }}
      />
    </Screen>
  );
}
