import type { Container } from '../domain/Container';
import type { Document } from '../domain/Document';
import { DomainError } from '../domain/errors/DomainError';
import type { Shape } from '../domain/Shape';
import { containerLabel } from './commandFormat';
import type { EditCommand } from './EditCommand';

export class DeleteCommand implements EditCommand {
  private parent: Container | null = null;
  private index = 0;

  constructor(private readonly shape: Shape) {}

  execute(_document: Document): string {
    const parent = this.shape.parent;
    if (parent === null) {
      throw new DomainError(`no such shape: ${this.shape.id}`);
    }
    this.parent = parent;
    this.index = parent.indexOfChild(this.shape);
    parent.removeChild(this.shape);
    return `${this.shape.ref} deleted`;
  }

  undo(_document: Document): string {
    if (this.parent === null) {
      throw new DomainError(`no such shape: ${this.shape.id}`);
    }
    this.parent.insertChild(this.shape, this.index);
    return `${this.shape.ref} restored into ${containerLabel(this.parent)}`;
  }
}
