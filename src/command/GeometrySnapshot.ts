import type { Shape, GeometryRecord } from '../domain/Shape';
import { DomainError } from '../domain/errors/DomainError';

export interface GeometrySnapshot {
  readonly shape: Shape;
  readonly geometry: GeometryRecord;
}

/** Capture absolute geometry so undo/redo never accumulates float error. */
export function captureGeometry(shapes: readonly Shape[]): GeometrySnapshot[] {
  return shapes.map((shape) => ({ shape, geometry: shape.readGeometry() }));
}

export function restoreGeometry(snapshots: readonly GeometrySnapshot[]): void {
  for (const snapshot of snapshots) {
    snapshot.shape.writeGeometry(snapshot.geometry);
  }
}

/** Restore the entire edited subtree if any geometry overflows. */
export function validateGeometry(snapshots: readonly GeometrySnapshot[]): void {
  for (const snapshot of snapshots) {
    if (Object.values(snapshot.shape.readGeometry()).some(value => !Number.isFinite(value))) {
      restoreGeometry(snapshots);
      throw new DomainError('geometry must remain finite');
    }
  }
}
