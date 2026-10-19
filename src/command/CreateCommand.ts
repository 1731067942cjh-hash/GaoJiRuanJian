import type { Container } from '../domain/Container';
import { Document } from '../domain/Document';
import { DomainError } from '../domain/errors/DomainError';
import type { Shape } from '../domain/Shape';
import type { EditCommand } from './EditCommand';

export class CreateCommand implements EditCommand {
  constructor(
    private readonly shape: Shape,
    private readonly parent: Container,
  ) {}

  execute(document: Document): string {
    if (this.shape.id === 'svg' || document.find(this.shape.id) !== undefined) {
      throw new DomainError(`id already exists: ${this.shape.id}`);
    }
    this.parent.appendChild(this.shape);
    if (this.parent instanceof Document) {
      return `${this.shape.ref} created`;
    }
    return `${this.shape.ref} created in ${this.parent.ref}`;
  }

  undo(_document: Document): string {
    this.parent.removeChild(this.shape);
    return `${this.shape.ref} deleted`;
  }
}
