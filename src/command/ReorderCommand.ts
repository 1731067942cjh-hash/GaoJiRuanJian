import type { Container } from '../domain/Container';
import type { Document } from '../domain/Document';
import { DomainError } from '../domain/errors/DomainError';
import type { Shape } from '../domain/Shape';
import type { EditCommand } from './EditCommand';

export class ReorderCommand implements EditCommand {
  private parent: Container | null = null;
  private oldIndex = 0;

  constructor(
    private readonly shape: Shape,
    private readonly toFront: boolean,
  ) {}

  execute(_document: Document): string {
    const parent = this.shape.parent;
    if (parent === null) {
      throw new DomainError(`no such shape: ${this.shape.id}`);
    }
    this.parent = parent;
    this.oldIndex = parent.indexOfChild(this.shape);
    parent.removeChild(this.shape);
    parent.insertChild(this.shape, this.toFront ? parent.children.length : 0);
    return `${this.shape.ref} moved to ${this.toFront ? 'front' : 'back'}`;
  }

  undo(_document: Document): string {
    if (this.parent === null) {
      throw new DomainError('nothing to undo');
    }
    this.parent.removeChild(this.shape);
    this.parent.insertChild(this.shape, this.oldIndex);
    return `${this.shape.ref} moved back`;
  }
}
