import { z } from 'zod';
function fixedDecimal(value: string, scale: number): string {
  const [whole = '0', fraction = ''] = value.split('.');
  return `${whole.replace(/^0+(?=\d)/, '')}.${fraction.padEnd(scale, '0')}`;
}
export const kilogramsSchema = z
  .string()
  .regex(
    /^\d{1,7}(\.\d{1,2})?$/,
    'Use a nonnegative decimal string with up to two fractional digits',
  )
  .transform((value) => fixedDecimal(value, 2));
export const rpeSchema = z
  .string()
  .regex(
    /^(?:[1-9](?:\.\d)?|10(?:\.0)?)$/,
    'Use a decimal string from 1.0 to 10.0',
  )
  .transform((value) => fixedDecimal(value, 1));
export const kg = (value: string): string => kilogramsSchema.parse(value);
export const rpe = (value: string): string => rpeSchema.parse(value);
