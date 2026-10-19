import { Container } from '../domain/Container';
import type { Document } from '../domain/Document';
import { DomainError } from '../domain/errors/DomainError';
import { formatNumber } from '../domain/NumberFormat';
import type { Shape } from '../domain/Shape';
import { captureGeometry, restoreGeometry, type GeometrySnapshot } from './GeometrySnapshot';
import type { EditCommand } from './EditCommand';

export class ScaleCommand implements EditCommand {
  private before: GeometrySnapshot[] = [];
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
    const targets =
      this.shape instanceof Container ? this.shape.descendants() : [this.shape];
    this.before = captureGeometry(targets);
    this.count = targets.length;
    this.shape.scaleBy(this.factor);
    const factor = formatNumber(this.factor);
    if (this.shape instanceof Container) {
      return `${this.shape.ref} scaled by ${factor} (${this.count} shapes)`;
    }
    return `${this.shape.ref} scaled by ${factor}`;
  }

  undo(_document: Document): string {
    restoreGeometry(this.before);
    if (this.shape instanceof Container) {
      return `${this.shape.ref} scaled back (${this.count} shapes)`;
    }
    return `${this.shape.ref} scaled back`;
  }
}
