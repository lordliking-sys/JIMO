import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Button, Text, colors } from '@jimo/ui';
import {
  customExerciseInputSchema,
  trackingModes,
  loadModes,
  type ExerciseDto,
  type ImportDraftExercise,
} from '@jimo/schemas';
import { useExercises } from '../../src/api/queries';
import { useImportDraft } from '../../src/imports/Provider';
import {
  Field,
  FormScreen,
  FormHeader,
  ErrorNotice,
} from '../../src/programs/components';
import { Choice, choiceStyles } from '../../src/programs/NumberControl';
import { PrescriptionEditor } from '../../src/programs/PrescriptionEditor';
function Editor({ dayId, item }: { dayId: string; item: ImportDraftExercise }) {
  const review = useImportDraft(),
    router = useRouter(),
    { t } = useTranslation('imports'),
    { t: p } = useTranslation('programs');
  const [mapping, setMapping] = useState(!item.exercise && !item.custom),
    [custom, setCustom] = useState(false),
    [search, setSearch] = useState(''),
    [debounced, setDebounced] = useState(''),
    [name, setName] = useState(item.custom?.name ?? item.rawName ?? ''),
    [tracking, setTracking] = useState<'reps' | 'duration' | null>(
      item.custom?.trackingMode ?? null,
    ),
    [mode, setMode] = useState<(typeof loadModes)[number] | null>(
      item.custom?.defaultLoadMode ?? null,
    ),
    [invalid, setInvalid] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);
  const query = useExercises(debounced);
  const update = async (values: Partial<ImportDraftExercise>) => {
    setBusy(true);
    try {
      await review.update((d) => ({
        ...d!,
        days: d!.days.map((day) =>
          day.localId === dayId
            ? {
                ...day,
                exercises: day.exercises.map((e) =>
                  e.localId === item.localId ? { ...e, ...values } : e,
                ),
              }
            : day,
        ),
      }));
      setMapping(false);
      setCustom(false);
    } catch (error) {
      setError(true);
      throw error;
    } finally {
      setBusy(false);
    }
  };
  const selected: ExerciseDto | null =
    item.exercise ??
    (item.custom
      ? {
          id: item.localId,
          canonicalName: item.custom.name,
          displayName: item.custom.name,
          isCustom: true,
          trackingMode: item.custom.trackingMode,
          defaultLoadMode: item.custom.defaultLoadMode ?? null,
        }
      : null);
  if (!mapping && selected)
    return (
      <PrescriptionEditor
        key={selected.id}
        exercise={selected}
        initial={item.prescription}
        preserveMissing
        pending={busy}
        mappingAction={
          <Button
            variant="text"
            label={t('changeMapping')}
            disabled={busy}
            onPress={() => setMapping(true)}
          />
        }
        error={error ? new Error('IMPORT_STORAGE') : null}
        save={(input) => {
          const { exerciseId: _, ...prescription } = input;
          void update({ prescription })
            .then(() => router.back())
            .catch(() => {});
        }}
      />
    );
  return (
    <FormScreen invalid={invalid}>
      <FormHeader title={t('mapping')} />
      {item.rawName ? (
        <>
          <Text variant="label" color={colors.secondary}>
            {t('rawName')}
          </Text>
          <Text>{item.rawName}</Text>
        </>
      ) : null}
      <Text color={colors.secondary}>{t('mappingNotice')}</Text>
      {error ? (
        <Text accessibilityRole="alert" color={colors.danger}>
          {t('errors.storage')}
        </Text>
      ) : null}
      {custom ? (
        <>
          <Text>{t('customNotice')}</Text>
          <Field
            label={p('exerciseName')}
            value={name}
            onChangeText={setName}
            maxLength={160}
          />
          <Text variant="label">{p('tracking')}</Text>
          <View style={choiceStyles.row}>
            {trackingModes.map((v) => (
              <Choice
                key={v}
                label={p(`trackingModes.${v}`)}
                selected={tracking === v}
                onPress={() => setTracking(v)}
              />
            ))}
          </View>
          <Text variant="label">{p('defaultLoad')}</Text>
          <View style={choiceStyles.row}>
            <Choice
              label={p('none')}
              selected={mode === null}
              onPress={() => setMode(null)}
            />
            {loadModes.map((v) => (
              <Choice
                key={v}
                label={p(`loadModes.${v}`)}
                selected={mode === v}
                onPress={() => setMode(v)}
              />
            ))}
          </View>
          <Button
            label={t('useCustom')}
            busy={busy}
            onPress={() => {
              const result = customExerciseInputSchema.safeParse({
                name,
                trackingMode: tracking,
                defaultLoadMode: mode,
              });
              setInvalid(!result.success);
              if (result.success)
                void update({ exercise: null, custom: result.data }).catch(
                  () => {},
                );
            }}
          />
        </>
      ) : (
        <>
          {item.match.suggestions.length ? (
            <>
              <Text variant="label">{t('suggestions')}</Text>
              {item.match.suggestions.map((e) => (
                <Button
                  key={e.id}
                  label={e.displayName}
                  variant="text"
                  disabled={busy}
                  onPress={() =>
                    void update({ exercise: e, custom: null }).catch(() => {})
                  }
                />
              ))}
            </>
          ) : null}
          <Field label={p('search')} value={search} onChangeText={setSearch} />
          <Button
            label={p('createCustom')}
            variant="text"
            disabled={busy}
            onPress={() => setCustom(true)}
          />
          {query.isPending ? (
            <Text>{p('loading')}</Text>
          ) : query.error ? (
            <ErrorNotice
              error={query.error}
              retry={() => void query.refetch()}
            />
          ) : (
            <>
              {query.data.pages
                .flatMap((page) => page.exercises)
                .map((e) => (
                  <Button
                    key={e.id}
                    label={e.displayName}
                    variant="text"
                    disabled={busy}
                    onPress={() =>
                      void update({ exercise: e, custom: null }).catch(() => {})
                    }
                  />
                ))}
              {query.hasNextPage ? (
                <Button
                  label={p('loadMore')}
                  variant="text"
                  busy={query.isFetchingNextPage}
                  onPress={() => void query.fetchNextPage()}
                />
              ) : null}
            </>
          )}
        </>
      )}
    </FormScreen>
  );
}
export default function ImportExercise() {
  const { dayId, itemId } = useLocalSearchParams<{
      dayId: string;
      itemId: string;
    }>(),
    review = useImportDraft(),
    item = review.draft?.days
      .find((d) => d.localId === dayId)
      ?.exercises.find((e) => e.localId === itemId);
  return item ? <Editor dayId={dayId} item={item} /> : null;
}
