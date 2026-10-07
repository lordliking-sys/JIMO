import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text, Button, colors, spacing } from '@jimo/ui';
import { useExercises } from '../../../src/api/queries';
import {
  Back,
  Field,
  ErrorNotice,
  FormScreen,
  FormSection,
} from '../../../src/programs/components';
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
    <FormScreen>
      <Back />
      <Text variant="h1">{t('chooseExercise')}</Text>
      <Field label={t('search')} value={search} onChangeText={setSearch} />
      <Button
        variant="text"
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
            <FormSection key={String(custom)}>
              <Text variant="label">
                {t(custom ? 'customExercises' : 'systemExercises')}
              </Text>
              {entries
                .filter((e) => e.isCustom === custom)
                .map((e) => (
                  <Button
                    variant="text"
                    style={{
                      alignSelf: 'stretch',
                      alignItems: 'flex-start',
                      paddingVertical: spacing.md,
                      borderBottomWidth: 1,
                      borderBottomColor: colors.border,
                    }}
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
            </FormSection>
          ))}
          {query.hasNextPage ? (
            <Button
              variant="text"
              label={t('loadMore')}
              busy={query.isFetchingNextPage}
              onPress={() => void query.fetchNextPage()}
            />
          ) : null}
        </>
      )}
    </FormScreen>
  );
}
