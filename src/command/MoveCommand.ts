import { Container } from '../domain/Container';
import type { Document } from '../domain/Document';
import { formatNumber } from '../domain/NumberFormat';
import type { Shape } from '../domain/Shape';
import { captureGeometry, restoreGeometry, type GeometrySnapshot } from './GeometrySnapshot';
import type { EditCommand } from './EditCommand';

export class MoveCommand implements EditCommand {
  private before: GeometrySnapshot[] = [];

  constructor(
    private readonly shape: Shape,
    private readonly dx: number,
    private readonly dy: number,
  ) {}

  execute(_document: Document): string {
    const targets =
      this.shape instanceof Container ? this.shape.descendants() : [this.shape];
    this.before = captureGeometry(targets);
    this.shape.moveBy(this.dx, this.dy);

    if (this.shape instanceof Container) {
      return `${this.shape.ref} moved by (${formatNumber(this.dx)},${formatNumber(this.dy)})`;
    }
    const anchor = this.shape.anchor();
    if (anchor === null) {
      return `${this.shape.ref} moved by (${formatNumber(this.dx)},${formatNumber(this.dy)})`;
    }
    return `${this.shape.ref} moved to (${formatNumber(anchor.x)},${formatNumber(anchor.y)})`;
  }

  undo(_document: Document): string {
    restoreGeometry(this.before);
    if (this.shape instanceof Container) {
      return `${this.shape.ref} moved back by (${formatNumber(-this.dx)},${formatNumber(-this.dy)})`;
    }
    const anchor = this.shape.anchor();
    if (anchor === null) {
      return `${this.shape.ref} moved back by (${formatNumber(-this.dx)},${formatNumber(-this.dy)})`;
    }
    return `${this.shape.ref} moved back to (${formatNumber(anchor.x)},${formatNumber(anchor.y)})`;
  }
}
