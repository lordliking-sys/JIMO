import { useLocalSearchParams, useRouter } from 'expo-router';
import type { ProgramInput } from '@jimo/schemas';
import {
  useProgram,
  useProgramMutation,
  useApiLocale,
} from '../../../src/api/queries';
import { programsApi } from '../../../src/api/programs';
import { ProgramForm } from '../../../src/programs/ProgramForm';
import { QueryState } from '../../../src/programs/components';
export default function Settings() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    router = useRouter(),
    locale = useApiLocale(),
    query = useProgram(id);
  const mutation = useProgramMutation((input: ProgramInput) =>
    programsApi.update(id, input, locale),
  );
  if (!query.data)
    return (
      <QueryState
        pending={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
      />
    );
  return (
    <ProgramForm
      initial={query.data}
      pending={mutation.isPending}
      error={mutation.error}
      save={(input) => {
        if (!mutation.isPending)
          mutation.mutate(input, { onSuccess: () => router.back() });
      }}
    />
  );
}
