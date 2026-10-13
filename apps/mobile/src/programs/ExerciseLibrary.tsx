import { ExerciseThumbnail } from '../programs/ExerciseThumbnail';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View, ScrollView } from 'react-native';
import { Text } from '@jimo/ui';
import { useExercises } from '../api/queries';
import {
  FormHeader,
  Field,
  ErrorNotice,
  FormScreen,
} from '../programs/components';
import {
  ProgramRow,
  ProgramButton,
  programInk,
} from '../programs/presentation';
import { Choice } from '../programs/NumberControl';
export function ExerciseLibrary({
  onChoose,
  onCustom,
}: {
  onChoose(exercise: import('@jimo/schemas').ExerciseDto): void;
  onCustom(): void;
}) {
  const { t } = useTranslation('programs');
  const [search, setSearch] = useState(''),
    [debounced, setDebounced] = useState(''),
    [source, setSource] = useState<'all' | 'system' | 'custom'>('all'),
    [tracking, setTracking] = useState<'all' | 'reps' | 'duration'>('all');
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);
  const query = useExercises(debounced),
    entries = query.data?.pages.flatMap((p) => p.exercises) ?? [];
  const visible = entries.filter(
    (e) =>
      (source === 'all' || e.isCustom === (source === 'custom')) &&
      (tracking === 'all' || e.trackingMode === tracking),
  );
  return (
    <FormScreen
      presentation
      header={<FormHeader title={t('addExercise')} />}
      background="library"
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <View style={{ flex: 1 }}>
          <Field
            label={t('search')}
            placeholder={t('search')}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>
      <ScrollView
        horizontal
        style={{ flexGrow: 0, flexShrink: 0 }}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 6, alignItems: 'center' }}
      >
        {(['all', 'system', 'custom'] as const).map((value) => (
          <Choice
            key={value}
            label={t(
              value === 'all'
                ? 'allExercises'
                : value === 'system'
                  ? 'systemExercises'
                  : 'customExercises',
            )}
            selected={source === value}
            onPress={() => setSource(value)}
          />
        ))}
      </ScrollView>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {(['all', 'reps', 'duration'] as const).map((value) => (
          <Choice
            key={value}
            label={t(
              value === 'all' ? 'allExercises' : `trackingModes.${value}`,
            )}
            selected={tracking === value}
            onPress={() => setTracking(value)}
          />
        ))}
      </View>
      {tracking !== 'all' ? (
        <Text variant="caption" color={programInk.secondary}>
          {t(`trackingModes.${tracking}`)}
        </Text>
      ) : null}
      {query.isPending ? (
        <Text color={programInk.secondary}>{t('loading')}</Text>
      ) : query.error ? (
        <ErrorNotice error={query.error} retry={() => void query.refetch()} />
      ) : (
        <View style={{ gap: 8 }}>
          {!visible.length ? (
            <Text color={programInk.secondary}>{t('noExercises')}</Text>
          ) : null}
          {visible.map((e) => (
            <ProgramRow
              key={e.id}
              title={e.displayName}
              cardTone="dark"
              leading={
                <ExerciseThumbnail exercise={e} cardBackground={false} />
              }
              label={e.displayName}
              subtitle={`${t(`trackingModes.${e.trackingMode}`)} · ${t(e.isCustom ? 'customExercises' : 'systemExercises')}`}
              onPress={() => onChoose(e)}
            />
          ))}
          {query.hasNextPage ? (
            <ProgramButton
              variant="text"
              label={t('loadMore')}
              busy={query.isFetchingNextPage}
              onPress={() => void query.fetchNextPage()}
            />
          ) : null}
        </View>
      )}
      <ProgramButton
        variant="text"
        label={t('createCustom')}
        onPress={onCustom}
      />
    </FormScreen>
  );
}
