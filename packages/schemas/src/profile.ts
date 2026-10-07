import { z } from 'zod';
import { localePreferenceSchema } from './onboarding';
export const unitSystemSchema = z.enum(['metric', 'imperial']);
export const profileSchema = z.object({
  id: z.uuid(),
  displayName: z.string().nullable(),
  locale: localePreferenceSchema,
  unitSystem: unitSystemSchema,
  createdAt: z.iso.datetime(),
  initialized: z.boolean(),
});
export const profileUpdateSchema = z
  .strictObject({
    displayName: z.string().trim().min(1).max(120).optional(),
    locale: localePreferenceSchema.optional(),
    unitSystem: unitSystemSchema.optional(),
    initialize: z.literal(true).optional(),
  })
  .refine((value) => Object.keys(value).length > 0);
export type Profile = z.infer<typeof profileSchema>;
export type ProfileUpdate = z.infer<typeof profileUpdateSchema>;
