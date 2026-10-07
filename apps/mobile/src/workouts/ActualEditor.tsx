import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { WorkoutExercise } from '@jimo/schemas';
import { colors, spacing, Text } from '@jimo/ui';
import { NumberControl } from '../programs/NumberControl';
import { decimalDisplay, stepDecimal, stepInteger } from '../programs/helpers';
import type { ActualDraft } from './helpers';
export function ActualEditor({
  exercise,
  draft,
  onChange,
}: {
  exercise: WorkoutExercise;
  draft: ActualDraft;
  onChange: (next: ActualDraft) => void;
}) {
  const { t, i18n } = useTranslation('workouts'),
    locale = i18n.resolvedLanguage === 'it' ? 'it' : 'en';
  const set = (key: keyof ActualDraft, value: string) =>
    onChange({ ...draft, [key]: value });
  const integer = (key: 'reps' | 'duration', min: number) => ({
    value: draft[key],
    onChange: (v: string) => set(key, v),
    onStep: (direction: 1 | -1) => {
      try {
        set(
          key,
          stepInteger(draft[key], direction, {
            min,
            max: key === 'duration' ? 86400 : 1_000_000,
            step: key === 'duration' ? 5 : 1,
          }),
        );
      } catch {
        /* manual invalid text remains for validation */
      }
    },
  });
  const weight = (key: 'load' | 'assistance') => ({
    value: draft[key],
    onChange: (v: string) => set(key, v),
    onStep: (direction: 1 | -1) => {
      try {
        set(
          key,
          decimalDisplay(
            stepDecimal(
              draft[key].trim().replace(',', '.') || '0',
              '2.5',
              direction,
              2,
            ),
            locale,
          ),
        );
      } catch {
        /* preserve invalid draft */
      }
    },
  });
  return (
    <View style={{ gap: spacing.lg }}>
      {exercise.trackingModeSnapshot === 'reps' ? (
        <NumberControl
          label={t('reps')}
          {...integer('reps', 0)}
          max={1_000_000}
        />
      ) : (
        <NumberControl
          label={t('duration')}
          {...integer('duration', 1)}
          min={1}
          max={86400}
          unit={t('seconds')}
        />
      )}
      {exercise.loadModeSnapshot === 'weighted' ||
      exercise.loadModeSnapshot === 'external' ? (
        <NumberControl
          label={t(
            exercise.loadModeSnapshot === 'weighted' ? 'weighted' : 'load',
          )}
          {...weight('load')}
          unit="kg"
          prefix={exercise.loadModeSnapshot === 'weighted' ? '+' : ''}
          keyboardType="decimal-pad"
        />
      ) : exercise.loadModeSnapshot === 'assisted' ? (
        <NumberControl
          label={t('assisted')}
          {...weight('assistance')}
          unit="kg"
          keyboardType="decimal-pad"
        />
      ) : (
        <Text variant="caption" color={colors.secondary}>
          {t('bodyweight')}
        </Text>
      )}
      <NumberControl
        label={t('rpe')}
        value={draft.rpe}
        onChange={(v) => set('rpe', v)}
        onStep={(direction) => {
          try {
            set(
              'rpe',
              decimalDisplay(
                stepDecimal(
                  draft.rpe.trim().replace(',', '.') || '7',
                  '0.5',
                  direction,
                  1,
                ),
                locale,
              ),
            );
          } catch {
            /* preserve invalid draft */
          }
        }}
        min={1}
        max={10}
        keyboardType="decimal-pad"
        presetsFirst
        presets={[
          { value: '', label: t('noneRpe') },
          ...['7', '7.5', '8', '8.5', '9', '9.5', '10'].map((value) => ({
            value: decimalDisplay(value, locale),
            label: decimalDisplay(value, locale),
            accessibilityLabel: `RPE ${decimalDisplay(value, locale)}`,
          })),
        ]}
      />
    </View>
  );
}
