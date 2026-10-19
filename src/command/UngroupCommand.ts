import type { Container } from '../domain/Container';
import { Document } from '../domain/Document';
import { DomainError } from '../domain/errors/DomainError';
import type { Group } from '../domain/Group';
import type { Shape } from '../domain/Shape';
import type { EditCommand } from './EditCommand';

export class UngroupCommand implements EditCommand {
  private parent: Container | null = null;
  private index = 0;
  private children: Shape[] = [];

  constructor(private readonly group: Group) {}

  execute(_document: Document): string {
    const parent = this.group.parent;
    if (parent === null) {
      throw new DomainError(`no such shape: ${this.group.id}`);
    }
    if (parent instanceof Document) {
      throw new DomainError(`cannot ungroup top-level container: ${this.group.id}`);
    }
    this.parent = parent;
    this.index = parent.indexOfChild(this.group);
    this.children = [...this.group.children];
    parent.removeChild(this.group);
    for (const child of this.children) {
      this.group.removeChild(child);
    }
    this.children.forEach((child, offset) => {
      parent.insertChild(child, this.index + offset);
    });
    return `${this.group.ref} ungrouped (${this.children.length} children)`;
  }

  undo(_document: Document): string {
    if (this.parent === null) {
      throw new DomainError('nothing to undo');
    }
    for (const child of this.children) {
      this.parent.removeChild(child);
    }
    this.parent.insertChild(this.group, this.index);
    for (const child of this.children) {
      this.group.appendChild(child);
    }
    return `${this.group.ref} regrouped (${this.children.length} children)`;
  }
}
