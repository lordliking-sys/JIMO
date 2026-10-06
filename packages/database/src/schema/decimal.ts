import { customType } from 'drizzle-orm/pg-core';

function decimalColumn(precision: number, scale: number) {
  const integerDigits = precision - scale;
  const pattern = new RegExp(
    `^-?\\d{1,${integerDigits}}(?:\\.\\d{1,${scale}})?$`,
  );
  return customType<{ data: string; driverData: string | number }>({
    dataType: () => `numeric(${precision}, ${scale})`,
    toDriver(value) {
      if (typeof value !== 'string' || !pattern.test(value))
        throw new Error(
          'Numeric writes require a decimal string within the declared precision and scale',
        );
      return value;
    },
    fromDriver(value) {
      // Drizzle relational JSON aggregates can decode numeric as a number.
      // At <=9 significant digits the decimal round-trip is unambiguous; use
      // string operations only, and never expose that driver number to callers.
      const decimal = String(value);
      if (!pattern.test(decimal))
        throw new Error('Unexpected database decimal representation');
      const [whole = '0', fraction = ''] = decimal.split('.');
      return `${whole}.${fraction.padEnd(scale, '0')}`;
    },
  });
}
export const kilogramsColumn = decimalColumn(9, 2);
export const rpeColumn = decimalColumn(3, 1);
