import type { ProgramInput } from '@jimo/schemas';
import { useProgramMutation, useApiLocale } from '../api/queries';
import { programsApi } from '../api/programs';
import { ProgramForm } from './ProgramForm';
/** Creates the same draft as the existing manual route; activation stays an explicit choice. */
export function CreatePlan({ onCreated }: { onCreated(id: string): void }) {
  const locale = useApiLocale(),
    mutation = useProgramMutation((input: ProgramInput) =>
      programsApi.create(input, locale),
    );
  return (
    <ProgramForm
      pending={mutation.isPending}
      error={mutation.error}
      save={(input) =>
        mutation.mutate(input, { onSuccess: (data) => onCreated(data.id) })
      }
    />
  );
}
