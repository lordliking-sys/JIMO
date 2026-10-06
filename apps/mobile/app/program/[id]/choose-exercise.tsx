import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen, Text, Button, Card } from '@jimo/ui';
import { useExercises } from '../../../src/api/queries';
import { Back, Field, ErrorNotice } from '../../../src/programs/components';
export default function ChooseExercise() {
  const { id, dayId } = useLocalSearchParams<{ id: string; dayId: string }>(),
    router = useRouter(),
    { t } = useTranslation('programs');
  const [search, setSearch] = useState(''),
    [debounced, setDebounced] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);
  const query = useExercises(debounced);
  const entries = query.data?.pages.flatMap((page) => page.exercises) ?? [];
  return (
    <Screen>
      <Back />
      <Text variant="h1">{t('chooseExercise')}</Text>
      <Field label={t('search')} value={search} onChangeText={setSearch} />
      <Button
        variant="secondary"
        label={t('createCustom')}
        onPress={() =>
          router.push({
            pathname: '/program/[id]/custom-exercise',
            params: { id, dayId },
          })
        }
      />
      {query.isPending ? (
        <Text>{t('loading')}</Text>
      ) : query.error ? (
        <ErrorNotice error={query.error} retry={() => void query.refetch()} />
      ) : (
        <>
          {!entries.length ? <Text>{t('noExercises')}</Text> : null}
          {([false, true] as const).map((custom) => (
            <Card key={String(custom)}>
              <Text variant="label">
                {t(custom ? 'customExercises' : 'systemExercises')}
              </Text>
              {entries
                .filter((e) => e.isCustom === custom)
                .map((e) => (
                  <Button
                    variant="secondary"
                    key={e.id}
                    label={e.displayName}
                    onPress={() =>
                      router.push({
                        pathname: '/program/[id]/exercise',
                        params: { id, dayId, exerciseId: e.id },
                      })
                    }
                  />
                ))}
            </Card>
          ))}
          {query.hasNextPage ? (
            <Button
              variant="secondary"
              label={t('loadMore')}
              busy={query.isFetchingNextPage}
              onPress={() => void query.fetchNextPage()}
            />
          ) : null}
        </>
      )}
    </Screen>
  );
}
