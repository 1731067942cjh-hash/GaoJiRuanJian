import { DomainError } from './errors/DomainError';

const PRECISION_DIGITS = 6;

/** Parse a finite number or fail with a user-facing message. */
export function parseNumber(raw: string, label = 'number'): number {
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    throw new DomainError(`invalid ${label}: ${raw}`);
  }
  return value;
}

/**
 * Format a number without floating point noise. SVG attributes are textual,
 * so every write goes through this single function to keep round-trips stable.
 */
export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) {
    throw new DomainError('cannot format a non-finite number');
  }
  const factor = 10 ** PRECISION_DIGITS;
  const rounded = Math.round(value * factor) / factor;
  if (Object.is(rounded, -0)) {
    return '0';
  }
  const text = rounded.toFixed(PRECISION_DIGITS).replace(/\.?0+$/, '');
  return text === '-0' ? '0' : text;
}
