import type { OnboardingData } from '@jimo/schemas';
import { onboardingSchema } from '@jimo/schemas';
export type OnboardingDraft = Partial<OnboardingData>;
export const stepNames = [
  'welcome',
  'language',
  'goal',
  'level',
  'days',
  'equipment',
  'start',
] as const;
export function canContinue(step: number, draft: OnboardingDraft): boolean {
  switch (step) {
    case 0:
    case 1:
      return true;
    case 2:
      return onboardingSchema.shape.goal.safeParse(draft.goal).success;
    case 3:
      return onboardingSchema.shape.experienceLevel.safeParse(
        draft.experienceLevel,
      ).success;
    case 4:
      return onboardingSchema.shape.trainingDaysPerWeek.safeParse(
        draft.trainingDaysPerWeek,
      ).success;
    case 5:
      return onboardingSchema.shape.equipment.safeParse(draft.equipment)
        .success;
    default:
      return false;
  }
}
