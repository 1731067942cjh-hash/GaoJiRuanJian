import type { Container } from '../domain/Container';
import type { Document } from '../domain/Document';
import { DomainError } from '../domain/errors/DomainError';
import type { Group } from '../domain/Group';
import type { Shape } from '../domain/Shape';
import { CommandFormat } from './CommandFormat';
import type { EditCommand } from './EditCommand';

export class AddToCommand implements EditCommand {
  private oldParent: Container | null = null;
  private oldIndex = 0;

  constructor(
    private readonly shape: Shape,
    private readonly target: Group,
  ) {}

  execute(_document: Document): string {
    if (this.shape === this.target) {
      throw new DomainError(`cannot add container into its own descendant: ${this.shape.id}`);
    }
    let ancestor: Container | null = this.target;
    while (ancestor !== null) {
      if (ancestor === this.shape) {
        throw new DomainError(
          `cannot add container into its own descendant: ${this.shape.id}`,
        );
      }
      ancestor = ancestor.parent;
    }

    const parent = this.shape.parent;
    if (parent === null) {
      throw new DomainError(`no such shape: ${this.shape.id}`);
    }
    this.oldParent = parent;
    this.oldIndex = parent.indexOfChild(this.shape);
    parent.removeChild(this.shape);
    this.target.appendChild(this.shape);
    return `${this.shape.ref} moved into ${this.target.ref}`;
  }

  undo(_document: Document): string {
    if (this.oldParent === null) {
      throw new DomainError('nothing to undo');
    }
    this.target.removeChild(this.shape);
    this.oldParent.insertChild(this.shape, this.oldIndex);
    return `${this.shape.ref} moved back into ${CommandFormat.containerLabel(this.oldParent)}`;
  }
}
