import type { Prescription } from '@jimo/schemas';
import { decimalDisplay } from './helpers';

/** New manual choices; existing assistance records remain valid and editable. */
export const manualLoadModes = ['bodyweight', 'weighted', 'external'] as const;
export function initialPrescriptionMode(
  defaultMode: Prescription['loadMode'] | null,
  existing?: { loadMode?: Prescription['loadMode'] | null },
): Prescription['loadMode'] | '' {
  if (existing) return existing.loadMode ?? '';
  return defaultMode === 'weighted' || defaultMode === 'external'
    ? defaultMode
    : 'bodyweight';
}
/** Defaults belong to new manual entries, never to edits or incomplete imports. */
export function initialPrescriptionRpe(
  existing: { targetRpe?: string | null | undefined } | undefined,
  preserveMissing: boolean,
  locale: string,
) {
  return decimalDisplay(
    existing ? existing.targetRpe : preserveMissing ? null : '8.0',
    locale,
  );
}
