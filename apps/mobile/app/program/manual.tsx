import { useRouter } from 'expo-router';
import { useProgramMutation, useApiLocale } from '../../src/api/queries';
import { programsApi } from '../../src/api/programs';
import { ProgramForm } from '../../src/programs/ProgramForm';
import type { ProgramInput } from '@jimo/schemas';
export default function Manual() {
  const router = useRouter(),
    locale = useApiLocale();
  const mutation = useProgramMutation((input: ProgramInput) =>
    programsApi.create(input, locale),
  );
  return (
    <ProgramForm
      pending={mutation.isPending}
      error={mutation.error}
      save={(input) => {
        if (!mutation.isPending)
          mutation.mutate(input, {
            onSuccess: (data) =>
              router.replace({
                pathname: '/program/[id]',
                params: { id: data.id },
              }),
          });
      }}
    />
  );
}
