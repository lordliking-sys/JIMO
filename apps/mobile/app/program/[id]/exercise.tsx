import { useLocalSearchParams, useRouter } from 'expo-router';
import type {
  Prescription,
  ExerciseDto,
  ProgramExerciseDto,
} from '@jimo/schemas';
import {
  useProgram,
  useExercise,
  useProgramMutation,
  useApiLocale,
} from '../../../src/api/queries';
import { programsApi } from '../../../src/api/programs';
import { ApiClientError } from '../../../src/api/client';
import { QueryState } from '../../../src/programs/components';
import { PrescriptionEditor } from '../../../src/programs/PrescriptionEditor';
function ConnectedEditor({
  id,
  dayId,
  exercise,
  initial,
}: {
  id: string;
  dayId: string;
  exercise: ExerciseDto;
  initial?: ProgramExerciseDto;
}) {
  const router = useRouter(),
    locale = useApiLocale(),
    mutation = useProgramMutation((input: Prescription) =>
      programsApi.saveExercise(dayId, initial?.id, input, locale),
    );
  return (
    <PrescriptionEditor
      presentation
      fallback={{ pathname: '/program/[id]/day-detail', params: { id, dayId } }}
      exercise={exercise}
      {...(initial ? { initial } : {})}
      pending={mutation.isPending}
      error={mutation.error}
      save={(input) =>
        mutation.mutate(input, {
          onSuccess: () =>
            router.dismissTo({
              pathname: '/program/[id]/day-detail',
              params: { id, dayId },
            }),
        })
      }
    />
  );
}
export default function ExerciseEditor() {
  const { id, dayId, exerciseId, prescriptionId } = useLocalSearchParams<{
      id: string;
      dayId: string;
      exerciseId: string;
      prescriptionId?: string;
    }>(),
    query = useProgram(id),
    exercise = useExercise(exerciseId);
  if (!query.data || !exercise.data)
    return (
      <QueryState
        presentation
        pending={query.isPending || exercise.isPending}
        error={query.error || exercise.error}
        retry={() => {
          void query.refetch();
          void exercise.refetch();
        }}
      />
    );
  const day = query.data.days.find((d) => d.id === dayId);
  const initial = day?.exercises.find((e) => e.id === prescriptionId);
  if (!day || (prescriptionId && !initial))
    return (
      <QueryState
        presentation
        pending={false}
        error={new ApiClientError('NOT_FOUND', 404)}
        retry={() => void query.refetch()}
      />
    );
  return (
    <ConnectedEditor
      id={id}
      dayId={dayId}
      exercise={exercise.data}
      {...(initial ? { initial } : {})}
    />
  );
}
