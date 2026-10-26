import { Container } from '../domain/Container';
import { DomainError } from '../domain/errors/DomainError';
import type { Shape, GeometryRecord } from '../domain/Shape';

/** Memento of a subtree's absolute geometry, with transactional application. */
export class GeometrySnapshot {
  private readonly entries: ReadonlyArray<{ shape: Shape; geometry: GeometryRecord }>;

  constructor(shape: Shape) {
    const shapes = shape instanceof Container ? shape.descendants() : [shape];
    this.entries = shapes.map(target => ({ shape: target, geometry: target.readGeometry() }));
  }

  get size(): number { return this.entries.length; }

  apply(operation: () => void): void {
    try {
      operation();
      for (const { shape } of this.entries) {
        if (Object.values(shape.readGeometry()).some(value => !Number.isFinite(value))) {
          throw new DomainError('geometry must remain finite');
        }
      }
    } catch (error) {
      this.restore();
      throw error;
    }
  }

  restore(): void {
    for (const { shape, geometry } of this.entries) shape.writeGeometry(geometry);
  }
}
