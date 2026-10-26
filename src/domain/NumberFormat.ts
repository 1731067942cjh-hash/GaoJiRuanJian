import { DomainError } from './errors/DomainError';

/** Parse a finite number or fail with a user-facing message. */
export function parseNumber(raw: string, label = 'number'): number {
  const value = Number(raw);
  if (raw.trim().length === 0 || !Number.isFinite(value)) {
    throw new DomainError(`invalid ${label}: ${raw}`);
  }
  return value;
}

/**
 * Use the shortest round-trippable representation. Rounding to fixed decimal
 * places loses small coordinates, undo precision and large exponents.
 */
export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) {
    throw new DomainError('cannot format a non-finite number');
  }
  return String(value);
}
