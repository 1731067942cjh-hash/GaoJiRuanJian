import type { Container } from '../domain/Container';
import type { Document } from '../domain/Document';
import { DomainError } from '../domain/errors/DomainError';
import { Group } from '../domain/Group';
import type { Shape } from '../domain/Shape';
import type { EditCommand } from './EditCommand';

interface OriginalPosition {
  readonly shape: Shape;
  readonly parent: Container;
  readonly index: number;
}

export class GroupCommand implements EditCommand {
  private group: Group | null = null;
  private parent: Container | null = null;
  private insertionIndex = 0;
  private originals: OriginalPosition[] = [];

  constructor(
    private readonly newId: string,
    private readonly targets: readonly Shape[],
  ) {}

  execute(document: Document): string {
    if (document.hasId(this.newId)) {
      throw new DomainError(`id already exists: ${this.newId}`);
    }
    if (this.targets.length < 2) {
      throw new DomainError('group needs at least two shapes');
    }
    const seen = new Set<string>();
    for (const target of this.targets) {
      if (seen.has(target.id)) {
        throw new DomainError(`duplicate shape in group: ${target.id}`);
      }
      seen.add(target.id);
      if (target.parent === null) {
        throw new DomainError(`no such shape: ${target.id}`);
      }
    }

    const targetSet = new Set<Shape>(this.targets);
    for (const target of this.targets) {
      let ancestor: Container | null = target.parent;
      while (ancestor !== null) {
        if (targetSet.has(ancestor)) {
          throw new DomainError(
            `cannot group a container into its own descendant: ${ancestor.id}`,
          );
        }
        ancestor = ancestor.parent;
      }
    }

    // Preserve the document's existing drawing order, not argument order.
    const ordered = document.allShapes().filter((shape) => targetSet.has(shape));
    const group = new Group(this.newId); // Validate the id before any mutation.
    const first = ordered[0];
    const parent = first.parent;
    if (parent === null) {
      throw new DomainError(`no such shape: ${first.id}`);
    }
    const firstIndex = parent.indexOfChild(first);
    this.insertionIndex = parent.children
      .slice(0, firstIndex)
      .filter((child) => !targetSet.has(child)).length;
    this.parent = parent;
    this.originals = this.targets.map((shape) => {
      const owner = shape.parent;
      if (owner === null) {
        throw new DomainError(`no such shape: ${shape.id}`);
      }
      return { shape, parent: owner, index: owner.indexOfChild(shape) };
    });

    for (const target of ordered) {
      target.parent?.removeChild(target);
    }

    parent.insertChild(group, this.insertionIndex);
    for (const target of ordered) {
      group.appendChild(target);
    }
    this.group = group;
    return `${group.ref} created with ${this.targets.length} children`;
  }

  undo(_document: Document): string {
    if (this.group === null || this.parent === null) {
      throw new DomainError('nothing to undo');
    }
    this.parent.removeChild(this.group);
    const children = [...this.group.children];
    for (const child of children) {
      this.group.removeChild(child);
    }
    const restored = [...this.originals].sort((left, right) => left.index - right.index);
    for (const original of restored) {
      original.parent.insertChild(original.shape, original.index);
    }
    return `${this.group.ref} removed, ${children.length} children restored`;
  }
}
