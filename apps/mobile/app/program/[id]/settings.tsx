import { useLocalSearchParams, useRouter } from 'expo-router';
import type { ProgramInput } from '@jimo/schemas';
import {
  useProgram,
  useProgramMutation,
  useApiLocale,
} from '../../../src/api/queries';
import { programsApi } from '../../../src/api/programs';
import { ProgramForm } from '../../../src/programs/ProgramForm';
import {
  QueryState,
  useConfirmation,
  ErrorNotice,
} from '../../../src/programs/components';
import { ProgramButton } from '../../../src/programs/presentation';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
export default function Settings() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    router = useRouter(),
    locale = useApiLocale(),
    query = useProgram(id);
  const { t } = useTranslation('programs'),
    confirmation = useConfirmation();
  const archive = useProgramMutation(() => programsApi.archive(id, locale));
  const mutation = useProgramMutation((input: ProgramInput) =>
    programsApi.update(id, input, locale),
  );
  if (!query.data)
    return (
      <QueryState
        presentation
        pending={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
      />
    );
  return (
    <ProgramForm
      fallback={{ pathname: '/program/[id]', params: { id } }}
      initial={query.data}
      pending={mutation.isPending}
      error={mutation.error}
      save={(input) => {
        if (!mutation.isPending)
          mutation.mutate(input, {
            onSuccess: () =>
              router.canGoBack()
                ? router.back()
                : router.replace({ pathname: '/program/[id]', params: { id } }),
          });
      }}
      actions={
        <View style={{ gap: 8 }}>
          <ProgramButton
            variant="outline"
            label={t('manageDays')}
            onPress={() =>
              router.push({ pathname: '/program/[id]', params: { id } })
            }
          />
          {query.data.status !== 'archived' ? (
            <ProgramButton
              variant="text"
              label={t('archive')}
              busy={archive.isPending}
              onPress={() =>
                confirmation.ask(
                  t(
                    query.data.status === 'active'
                      ? 'confirmArchive'
                      : 'confirmArchiveAny',
                  ),
                  () => archive.mutate(),
                )
              }
            />
          ) : null}
          {archive.error ? <ErrorNotice error={archive.error} /> : null}
          {confirmation.dialog}
        </View>
      }
    />
  );
}
