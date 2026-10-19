import type { Container } from '../domain/Container';
import { Document } from '../domain/Document';
import type { Shape } from '../domain/Shape';

/** Label used in messages: the document is simply `svg`. */
export function containerLabel(container: Container): string {
  return container instanceof Document ? 'svg' : container.ref;
}

/** Standard feedback for `set`, including the quoting rule for text content. */
export function setMessage(shape: Shape, attribute: string, value: string): string {
  if (attribute === 'text') {
    return `${shape.ref} updated: text=${JSON.stringify(value)}`;
  }
  return `${shape.ref} updated: ${attribute}=${value}`;
}
