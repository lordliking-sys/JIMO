import { useState } from 'react';
import { Modal, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useReducedMotion } from 'react-native-reanimated';
import type { ActualInput, WorkoutExercise, WorkoutSet } from '@jimo/schemas';
import { ActualEditor } from '../ActualEditor';
import { actualPayload, prefillDraft } from '../helpers';
import { useWorkoutActions, useWorkoutMutation } from '../queries';
import { useApiLocale } from '../../api/queries';
import { workoutHaptic } from '../haptics';
import { SafeBack, useSafeBack } from '../../navigation/SafeBack';
import { InkButton } from './components';
import {
  InkText,
  WorkoutFormViewport,
  WorkoutTypography,
  useWorkoutLayout,
} from './Surface';
import { ink } from './theme';

/** Editing owns only its draft. The live session/rest surface remains mounted. */
export function SetCorrectionModal({
  exercise,
  set,
  onClose,
}: {
  exercise: WorkoutExercise;
  set: WorkoutSet;
  onClose: () => void;
}) {
  const { t } = useTranslation('workouts'),
    locale = useApiLocale();
  const actions = useWorkoutActions();
  const reducedMotion = useReducedMotion();
  const [draft, setDraft] = useState(() => prefillDraft(exercise, set, locale));
  const close = useSafeBack('/workout', onClose, false);
  const save = useWorkoutMutation(
    (actual: ActualInput) => actions.save(set.id, actual, true),
    () => {
      workoutHaptic('set', reducedMotion);
      onClose();
    },
  );
  const { usableHeight, fontScale } = useWorkoutLayout();
  let actual: ActualInput | null = null;
  try {
    actual = actualPayload(exercise, draft);
  } catch {
    /* inline validation */
  }
  return (
    <Modal visible transparent animationType="none" onRequestClose={close}>
      <SafeAreaProvider>
        <SafeAreaView
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.72)',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <WorkoutTypography>
            <View
              testID="set-correction-overlay"
              accessibilityViewIsModal
              style={{
                width: '100%',
                maxWidth: 480,
                alignSelf: 'center',
                height: Math.min(
                  440 * Math.min(fontScale, 1.5),
                  usableHeight - 32,
                ),
                maxHeight: '100%',
                minHeight: 0,
                borderRadius: 24,
                borderWidth: 1,
                borderColor: ink.border,
                backgroundColor: ink.background,
                overflow: 'hidden',
              }}
            >
              <WorkoutFormViewport
                footer={
                  <View>
                    {!actual || save.error ? (
                      <InkText
                        accessibilityRole="alert"
                        style={{
                          fontSize: 15,
                          textAlign: 'center',
                          color: ink.secondary,
                        }}
                      >
                        {t(save.error ? 'offline.saveFailed' : 'invalid')}
                      </InkText>
                    ) : null}
                    <InkButton
                      primary
                      label={t('saveCorrection')}
                      disabled={!actual || save.isPending}
                      onPress={() => {
                        if (actual) save.mutate(actual);
                      }}
                    />
                    <InkButton label={t('cancelEdit')} onPress={close} />
                  </View>
                }
              >
                <View
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                >
                  <SafeBack dismiss={close} color={ink.parchment} />
                  <InkText
                    accessibilityRole="header"
                    style={{
                      flex: 1,
                      fontSize: 24,
                      textTransform: 'uppercase',
                    }}
                  >
                    {t('correctionTitle')}
                  </InkText>
                </View>
                <InkText style={{ color: ink.secondary, fontSize: 20 }}>
                  {exercise.exerciseNameSnapshot} · {t('set')} {set.setNumber}
                </InkText>
                <ActualEditor
                  exercise={exercise}
                  draft={draft}
                  onChange={setDraft}
                />
              </WorkoutFormViewport>
            </View>
          </WorkoutTypography>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}
