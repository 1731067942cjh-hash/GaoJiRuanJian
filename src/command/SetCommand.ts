import type { Document } from '../domain/Document';
import { DomainError } from '../domain/errors/DomainError';
import type { Shape } from '../domain/Shape';
import { CommandFormat } from './CommandFormat';
import type { EditCommand } from './EditCommand';

export class SetCommand implements EditCommand {
  private before: string | undefined;
  private captured = false;

  constructor(
    private readonly shape: Shape,
    private readonly attribute: string,
    private readonly value: string,
  ) {}

  execute(_document: Document): string {
    if (!this.shape.supportsAttribute(this.attribute)) {
      throw new DomainError(`unknown attribute: ${this.attribute}`);
    }
    this.before = this.shape.getAttribute(this.attribute);
    this.captured = true;
    this.shape.setAttribute(this.attribute, this.value);
    return CommandFormat.setMessage(this.shape, this.attribute, this.value);
  }

  undo(_document: Document): string {
    if (!this.captured) {
      throw new DomainError('nothing to undo');
    }
    if (this.before === undefined) {
      this.shape.clearAttribute(this.attribute);
      return `${this.shape.ref} updated: ${this.attribute} unset`;
    }
    this.shape.setAttribute(this.attribute, this.before);
    return CommandFormat.setMessage(this.shape, this.attribute, this.before);
  }
}
