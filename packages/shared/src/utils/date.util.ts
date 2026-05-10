import { ValidationException } from '../exceptions/validation.exception';

export function toISOString(date: Date): string {
  return date.toISOString();
}

export function fromISOString(s: string): Date {
  const d = new Date(s);
  if (isNaN(d.getTime())) {
    throw new ValidationException(
      `Invalid date string: "${s}"`,
      'INVALID_DATE',
    );
  }
  return d;
}

export function isValidDate(d: unknown): boolean {
  return d instanceof Date && !isNaN(d.getTime());
}
