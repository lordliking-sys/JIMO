import type { Prescription } from '@jimo/schemas';
import type { TFunction } from 'i18next';
import { decimalDisplay, restDisplay } from './helpers';

export function exerciseSummary(
  exercise: Prescription,
  locale: string,
  t: TFunction<'programs'>,
) {
  const target =
    exercise.targetDurationSeconds != null
      ? t('timedSummary', {
          sets: exercise.targetSets,
          seconds: exercise.targetDurationSeconds,
        })
      : exercise.targetRepMin != null
        ? t('rangeSummary', {
            sets: exercise.targetSets,
            min: exercise.targetRepMin,
            max: exercise.targetRepMax,
          })
        : t('fixedSummary', {
            sets: exercise.targetSets,
            reps: exercise.targetReps,
          });
  const unit = t('kgUnit');
  const load =
    exercise.loadMode === 'bodyweight'
      ? t('loadModes.bodyweight')
      : exercise.loadMode === 'assisted'
        ? exercise.targetAssistanceKg != null
          ? t('assistanceSummary', {
              value: decimalDisplay(exercise.targetAssistanceKg, locale),
              unit,
            })
          : t('loadModes.assisted')
        : exercise.targetLoadKg != null
          ? `${exercise.loadMode === 'weighted' ? '+' : ''}${decimalDisplay(exercise.targetLoadKg, locale)} ${unit}`
          : t(`loadModes.${exercise.loadMode}`);
  const details = [
    exercise.targetRpe != null
      ? t('rpeSummary', { value: decimalDisplay(exercise.targetRpe, locale) })
      : null,
    exercise.restSeconds != null
      ? t('restSummary', {
          value: `${restDisplay(exercise.restSeconds)}${exercise.restSeconds < 60 ? t('secondsSuffix') : ''}`,
        })
      : null,
  ]
    .filter((part): part is string => part !== null)
    .join(' · ');
  return { target, load, primary: `${target} · ${load}`, details };
}
