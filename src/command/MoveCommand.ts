import { Container } from '../domain/Container';
import type { Document } from '../domain/Document';
import { NumberFormat } from '../domain/NumberFormat';
import type { Shape } from '../domain/Shape';
import { GeometrySnapshot } from './GeometrySnapshot';
import type { EditCommand } from './EditCommand';

export class MoveCommand implements EditCommand {
  private before: GeometrySnapshot | null = null;

  constructor(
    private readonly shape: Shape,
    private readonly dx: number,
    private readonly dy: number,
  ) {}

  execute(_document: Document): string {
    this.before = new GeometrySnapshot(this.shape);
    this.before.apply(() => this.shape.moveBy(this.dx, this.dy));

    if (this.shape instanceof Container) {
      return `${this.shape.ref} moved by (${NumberFormat.format(this.dx)},${NumberFormat.format(this.dy)})`;
    }
    const anchor = this.shape.anchor();
    if (anchor === null) {
      return `${this.shape.ref} moved by (${NumberFormat.format(this.dx)},${NumberFormat.format(this.dy)})`;
    }
    return `${this.shape.ref} moved to (${NumberFormat.format(anchor.x)},${NumberFormat.format(anchor.y)})`;
  }

  undo(_document: Document): string {
    this.before?.restore();
    if (this.shape instanceof Container) {
      return `${this.shape.ref} moved back by (${NumberFormat.format(-this.dx)},${NumberFormat.format(-this.dy)})`;
    }
    const anchor = this.shape.anchor();
    if (anchor === null) {
      return `${this.shape.ref} moved back by (${NumberFormat.format(-this.dx)},${NumberFormat.format(-this.dy)})`;
    }
    return `${this.shape.ref} moved back to (${NumberFormat.format(anchor.x)},${NumberFormat.format(anchor.y)})`;
  }
}
