import { Container } from '../domain/Container';
import type { Document } from '../domain/Document';
import { DomainError } from '../domain/errors/DomainError';
import { NumberFormat } from '../domain/NumberFormat';
import type { Shape } from '../domain/Shape';
import { GeometrySnapshot } from './GeometrySnapshot';
import type { EditCommand } from './EditCommand';

export class ScaleCommand implements EditCommand {
  private before: GeometrySnapshot | null = null;
  private count = 0;

  constructor(
    private readonly shape: Shape,
    private readonly factor: number,
  ) {
    if (!Number.isFinite(factor) || factor <= 0) {
      throw new DomainError('scale factor must be positive');
    }
  }

  execute(_document: Document): string {
    this.before = new GeometrySnapshot(this.shape);
    this.count = this.before.size;
    this.before.apply(() => this.shape.scaleBy(this.factor));
    const factor = NumberFormat.format(this.factor);
    if (this.shape instanceof Container) {
      return `${this.shape.ref} scaled by ${factor} (${this.count} shapes)`;
    }
    return `${this.shape.ref} scaled by ${factor}`;
  }

  undo(_document: Document): string {
    this.before?.restore();
    if (this.shape instanceof Container) {
      return `${this.shape.ref} scaled back (${this.count} shapes)`;
    }
    return `${this.shape.ref} scaled back`;
  }
}
