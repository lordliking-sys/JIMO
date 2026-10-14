import type { ProgramInput } from '@jimo/schemas';
import { useProgramMutation, useApiLocale } from '../api/queries';
import { programsApi } from '../api/programs';
import { ProgramForm } from './ProgramForm';
import { useTranslation } from 'react-i18next';
/** Creates the same draft as the existing manual route; activation stays an explicit choice. */
export function CreatePlan({ onCreated }: { onCreated(id: string): void }) {
  const { t } = useTranslation('programs');
  const locale = useApiLocale(),
    mutation = useProgramMutation((input: ProgramInput) =>
      programsApi.create(input, locale),
    );
  return (
    <ProgramForm
      submitLabel={t('save')}
      pending={mutation.isPending}
      error={mutation.error}
      save={(input) =>
        mutation.mutate(input, { onSuccess: (data) => onCreated(data.id) })
      }
    />
  );
}
