import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View, ScrollView } from 'react-native';
import { Text } from '@jimo/ui';
import { useExercises } from '../../../src/api/queries';
import {
  FormHeader,
  Field,
  ErrorNotice,
  ActionMenu,
} from '../../../src/programs/components';
import {
  ProgramScreen,
  ProgramRow,
  ProgramButton,
  programInk,
} from '../../../src/programs/presentation';
import { Choice } from '../../../src/programs/NumberControl';
export default function ChooseExercise() {
  const { id, dayId } = useLocalSearchParams<{ id: string; dayId: string }>(),
    router = useRouter(),
    { t } = useTranslation('programs');
  const [search, setSearch] = useState(''),
    [debounced, setDebounced] = useState(''),
    [source, setSource] = useState<'all' | 'system' | 'custom'>('all'),
    [tracking, setTracking] = useState<'all' | 'reps' | 'duration'>('all'),
    [library, setLibrary] = useState(false);
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
    <ProgramScreen
      background="library"
      fallback={{ pathname: '/program/[id]/day-detail', params: { id, dayId } }}
    >
      <FormHeader title={t(library ? 'libraryTitle' : 'addExercise')} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <View style={{ flex: 1 }}>
          <Field
            label={t('search')}
            placeholder={t('search')}
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <ActionMenu
          label={t('filterExercises')}
          title={t('tracking')}
          actions={(['all', 'reps', 'duration'] as const).map((value) => ({
            label: t(
              value === 'all' ? 'allExercises' : `trackingModes.${value}`,
            ),
            action: () => setTracking(value),
          }))}
        />
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
              label={e.displayName}
              subtitle={`${t(`trackingModes.${e.trackingMode}`)} · ${t(e.isCustom ? 'customExercises' : 'systemExercises')}`}
              onPress={() =>
                router.push({
                  pathname: '/program/[id]/exercise',
                  params: { id, dayId, exerciseId: e.id },
                })
              }
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
        onPress={() =>
          router.push({
            pathname: '/program/[id]/custom-exercise',
            params: { id, dayId },
          })
        }
      />
      {!library ? (
        <ProgramButton
          variant="text"
          label={t('libraryTitle')}
          onPress={() => setLibrary(true)}
        />
      ) : null}
    </ProgramScreen>
  );
}
