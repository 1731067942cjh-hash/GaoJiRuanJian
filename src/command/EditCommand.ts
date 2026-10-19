import type { Document } from '../domain/Document';

/**
 * A single undoable editing operation. Every concrete command validates before
 * it mutates, so a thrown DomainError leaves the document untouched.
 */
export interface EditCommand {
  execute(document: Document): string;
  undo(document: Document): string;
}
