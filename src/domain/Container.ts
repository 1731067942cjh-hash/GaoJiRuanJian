import { Shape, type GeometryRecord } from './Shape';
import type { Matrix } from './Transform';
import { DomainError } from './errors/DomainError';

/**
 * Composite node: a `g` element or the document root. Containers have no
 * geometry of their own; moving or scaling one fans the operation out to every
 * descendant, which is what makes `move`/`scale` uniform across leaves and
 * groups.
 */
export abstract class Container extends Shape {
  private readonly _children: Shape[] = [];

  get children(): readonly Shape[] {
    return this._children;
  }

  appendChild(child: Shape): void {
    this.insertChild(child, this._children.length);
  }

  insertChild(child: Shape, index: number): void {
    if (!Number.isInteger(index) || index < 0 || index > this._children.length) {
      throw new DomainError(`invalid child index: ${index}`);
    }
    this._children.splice(index, 0, child);
    child.parent = this;
  }

  removeChild(child: Shape): number {
    const index = this._children.indexOf(child);
    if (index < 0) {
      throw new DomainError(`${child.ref} is not a child of ${this.ref}`);
    }
    this._children.splice(index, 1);
    child.parent = null;
    return index;
  }

  indexOfChild(child: Shape): number {
    return this._children.indexOf(child);
  }

  findInChildren(id: string): Shape | undefined {
    for (const child of this._children) {
      if (child.id === id) {
        return child;
      }
      if (child instanceof Container) {
        const found = child.findInChildren(id);
        if (found !== undefined) {
          return found;
        }
      }
    }
    return undefined;
  }

  /** Every shape below this container, in document order. */
  descendants(): Shape[] {
    const result: Shape[] = [];
    for (const child of this._children) {
      result.push(child);
      if (child instanceof Container) {
        result.push(...child.descendants());
      }
    }
    return result;
  }

  override moveBy(dx: number, dy: number): void {
    for (const child of this._children) {
      child.moveBy(dx, dy);
    }
  }

  override scaleBy(factor: number): void {
    for (const child of this._children) {
      child.scaleBy(factor);
    }
  }

  override transformBy(matrix: Matrix): void {
    for (const child of this._children) {
      child.transformBy(matrix);
    }
  }

  override readGeometry(): GeometryRecord {
    return {};
  }

  override writeGeometry(geometry: GeometryRecord): void {
    if (Object.keys(geometry).length > 0) {
      throw new DomainError('containers do not have geometry');
    }
  }

  override anchor(): null {
    return null;
  }
}
