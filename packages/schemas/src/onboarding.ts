import { z } from 'zod';
import { localePreferences } from '@jimo/types';
export const localePreferenceSchema = z.enum(localePreferences);
export const goals = [
  'strength',
  'muscle',
  'endurance',
  'fitness',
  'ownProgram',
] as const;
export const experienceLevels = [
  'beginner',
  'intermediate',
  'advanced',
] as const;
export const equipmentOptions = [
  'bodyweight',
  'pullUpBar',
  'dumbbells',
  'barbell',
  'machines',
  'fullGym',
] as const;
export const startMethods = ['ai', 'import', 'manual'] as const;
export const onboardingSchema = z.object({
  locale: localePreferenceSchema,
  goal: z.enum(goals),
  experienceLevel: z.enum(experienceLevels),
  trainingDaysPerWeek: z.number().int().min(1).max(7),
  equipment: z
    .array(z.enum(equipmentOptions))
    .min(1)
    .refine((items) => new Set(items).size === items.length),
  startMethod: z.enum(startMethods),
});
export type { LocalePreference } from '@jimo/types';
export type OnboardingData = z.infer<typeof onboardingSchema>;
export const preferencesSchema = z
  .object({
    version: z.literal(1),
    onboardingCompleted: z.boolean(),
    localePreference: localePreferenceSchema,
    onboarding: onboardingSchema.nullable(),
  })
  .refine((value) => !value.onboardingCompleted || value.onboarding !== null);
export type Preferences = z.infer<typeof preferencesSchema>;
