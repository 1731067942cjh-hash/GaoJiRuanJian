import type { Document } from '../domain/Document';
import { DomainError } from '../domain/errors/DomainError';
import type { EditCommand } from './EditCommand';

/**
 * Undo/redo history. Document I/O calls `lock()`, which clears both stacks and
 * rejects undo/redo until the next editing command runs.
 */
export class History {
  private readonly undoStack: EditCommand[] = [];
  private readonly redoStack: EditCommand[] = [];
  private locked = false;

  run(command: EditCommand, document: Document): string {
    const message = command.execute(document);
    this.undoStack.push(command);
    this.redoStack.length = 0;
    this.locked = false;
    return message;
  }

  undo(document: Document): string {
    if (this.locked) {
      // The spec uses this exact message for the undo/redo lock.
      throw new DomainError('undo not allowed after io command');
    }
    const command = this.undoStack.at(-1);
    if (command === undefined) {
      throw new DomainError('nothing to undo');
    }
    const message = command.undo(document);
    this.undoStack.pop();
    this.redoStack.push(command);
    return message;
  }

  redo(document: Document): string {
    if (this.locked) {
      throw new DomainError('undo not allowed after io command');
    }
    const command = this.redoStack.at(-1);
    if (command === undefined) {
      throw new DomainError('nothing to redo');
    }
    const message = command.execute(document);
    this.redoStack.pop();
    this.undoStack.push(command);
    return message;
  }

  lock(): void {
    this.undoStack.length = 0;
    this.redoStack.length = 0;
    this.locked = true;
  }

  get isLocked(): boolean {
    return this.locked;
  }
}
