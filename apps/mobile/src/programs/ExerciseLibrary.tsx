import { ExerciseThumbnail } from '../programs/ExerciseThumbnail';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
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
export function ExerciseLibrary({
  onChoose,
}: {
  onChoose(exercise: import('@jimo/schemas').ExerciseDto): void;
}) {
  const { t } = useTranslation('programs');
  const [search, setSearch] = useState(''),
    [debounced, setDebounced] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);
  const query = useExercises(debounced),
    entries = query.data?.pages.flatMap((p) => p.exercises) ?? [];
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
      {query.isPending ? (
        <Text color={programInk.secondary}>{t('loading')}</Text>
      ) : query.error ? (
        <ErrorNotice error={query.error} retry={() => void query.refetch()} />
      ) : (
        <View style={{ gap: 8 }}>
          {!entries.length ? (
            <Text color={programInk.secondary}>{t('noExercises')}</Text>
          ) : null}
          {entries.map((e) => (
            <ProgramRow
              key={e.id}
              title={e.displayName}
              cardTone="light"
              leading={<ExerciseThumbnail exercise={e} tone="light" />}
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
    </FormScreen>
  );
}
