import { ExerciseThumbnail } from '../programs/ExerciseThumbnail';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Pressable } from 'react-native';
import { Text, animePink } from '@jimo/ui';
import { useExercises } from '../api/queries';
import {
  FormHeader,
  Field,
  ErrorNotice,
  FormScreen,
} from '../programs/components';
import {
  ProgramButton,
  ProgramText,
  programInk,
} from '../programs/presentation';
export function ExerciseLibrary({
  onChoose,
  onCustom,
}: {
  onChoose(exercise: import('@jimo/schemas').ExerciseDto): void;
  onCustom?: () => void;
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
            <Pressable
              key={e.id}
              accessibilityRole="button"
              accessibilityLabel={e.displayName}
              onPress={() => onChoose(e)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                gap: 12,
                alignItems: 'center',
                minHeight: 76,
                paddingVertical: 8,
                borderBottomWidth: 1,
                borderColor: animePink.border,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <ExerciseThumbnail exercise={e} tone="light" />
              <ProgramText
                style={{ flex: 1, minWidth: 0, fontSize: 17, lineHeight: 23 }}
              >
                {e.displayName}
              </ProgramText>
            </Pressable>
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
      {onCustom ? (
        <ProgramButton
          variant="text"
          label={t('createCustom')}
          onPress={onCustom}
        />
      ) : null}
    </FormScreen>
  );
}
