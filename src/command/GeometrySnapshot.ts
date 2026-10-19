import type { Shape, GeometryRecord } from '../domain/Shape';

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
