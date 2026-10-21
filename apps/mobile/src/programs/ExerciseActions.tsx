import { useState } from 'react';
import type {
  ExerciseDto,
  Prescription,
  ProgramExerciseDto,
} from '@jimo/schemas';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useApiLocale, useProgramMutation } from '../api/queries';
import { programsApi } from '../api/programs';
import { ProgramOverlay } from './ProgramOverlay';
import { ExerciseLibrary } from './ExerciseLibrary';
import { CustomExerciseEditor } from './CustomExerciseEditor';
import { PrescriptionEditor } from './PrescriptionEditor';
import { ProgramButton } from './presentation';
import { useConfirmation } from './components';
import { useOffline } from '../db/Provider';
export function ExerciseActions({
  dayId,
  initial,
  close,
  selected,
  custom = false,
}: {
  dayId: string;
  initial?: ProgramExerciseDto;
  selected?: ExerciseDto;
  custom?: boolean;
  close(): void;
}) {
  const locale = useApiLocale(),
    { runtime } = useOffline(),
    { t } = useTranslation('programs'),
    confirmation = useConfirmation();
  const [step, setStep] = useState<'library' | 'custom' | 'editor'>(
    custom ? 'custom' : initial || selected ? 'editor' : 'library',
  );
  const [exercise, setExercise] = useState<ExerciseDto | null>(
    initial?.exercise ?? selected ?? null,
  );
  const save = useProgramMutation((input: Prescription) =>
    programsApi.saveExercise(dayId, initial?.id, input, locale),
  );
  const remove = useProgramMutation(
    () => programsApi.removeExercise(initial!.id, locale),
    () => runtime.prepareProgramChange(),
  );
  const back = () => {
    if (save.isPending || remove.isPending) return;
    if (step === 'library' || initial) close();
    else setStep('library');
  };
  return (
    <ProgramOverlay
      back={back}
      {...(step === 'editor' && exercise
        ? { title: exercise.displayName }
        : {})}
    >
      {step === 'library' ? (
        <ExerciseLibrary
          onChoose={(e) => {
            setExercise(e);
            setStep('editor');
          }}
        />
      ) : step === 'custom' ? (
        <CustomExerciseEditor
          onCreated={(e) => {
            setExercise(e);
            setStep('editor');
          }}
        />
      ) : exercise ? (
        <View style={{ flex: 1 }}>
          <PrescriptionEditor
            key={exercise.id}
            presentation
            exercise={exercise}
            {...(initial ? { initial } : {})}
            pending={save.isPending}
            error={save.error ?? remove.error}
            save={(input) => save.mutate(input, { onSuccess: close })}
            extraActions={
              initial ? (
                <ProgramButton
                  variant="text"
                  label={t('removeExercise')}
                  busy={remove.isPending}
                  onPress={() =>
                    confirmation.ask(t('confirmRemoveExercise'), () =>
                      remove.mutate(undefined, { onSuccess: close }),
                    )
                  }
                />
              ) : null
            }
          />
          {confirmation.dialog}
        </View>
      ) : null}
    </ProgramOverlay>
  );
}
