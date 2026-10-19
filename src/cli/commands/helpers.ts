import type { Document } from '../../domain/Document';
import { DomainError } from '../../domain/errors/DomainError';
import { Group } from '../../domain/Group';
import type { Shape } from '../../domain/Shape';
import type { EditorSession } from '../EditorSession';

export function requireDocument(session: EditorSession): Document {
  if (session.document === null) {
    throw new DomainError("no document. use 'init' or 'read' first");
  }
  return session.document;
}

export function resolveShape(session: EditorSession, id: string): Shape {
  const shape = requireDocument(session).find(id);
  if (shape === undefined) {
    throw new DomainError(`no such shape: ${id}`);
  }
  return shape;
}

/** Resolve a `g` container; used by the `in` clause and by `addto`. */
export function resolveGroup(session: EditorSession, id: string): Group {
  const shape = requireDocument(session).find(id);
  if (shape === undefined) {
    throw new DomainError(`no such container: ${id}`);
  }
  if (!(shape instanceof Group)) {
    throw new DomainError(`not a container: ${id}`);
  }
  return shape;
}

export function requireArgumentCount(
  args: readonly string[],
  minimum: number,
  maximum: number,
  usage: string,
): void {
  if (args.length < minimum || args.length > maximum) {
    throw new DomainError(`usage: ${usage}`);
  }
}
