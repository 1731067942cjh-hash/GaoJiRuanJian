import { Circle } from '../domain/Circle';
import { DomainError } from '../domain/errors/DomainError';
import { Ellipse } from '../domain/Ellipse';
import { Group } from '../domain/Group';
import { Line } from '../domain/Line';
import { Rect } from '../domain/Rect';
import type { AttributeMap, Shape, ShapeKind } from '../domain/Shape';
import { TextShape } from '../domain/TextShape';

/**
 * The single "type name -> class" dispatch point.
 *
 * @todo Plugin stage: replace this hard-coded registry with ShapeProvider
 * registrations loaded at startup. The kernel must not need to change when a
 * new shape type (for example `box`) is added.
 */
export class ShapeFactory {
  private readonly kinds = new Map<string, ShapeKind>();

  constructor(kinds: readonly ShapeKind[] = [Rect, Circle, Ellipse, Line, TextShape, Group]) {
    for (const kind of kinds) {
      this.kinds.set(kind.type, kind);
    }
  }

  has(type: string): boolean {
    return this.kinds.has(type);
  }

  createFromArgs(type: string, id: string, args: readonly string[]): Shape {
    const kind = this.kinds.get(type);
    if (kind === undefined) {
      throw new DomainError(`unknown shape type: ${type} (is the plugin loaded?)`);
    }
    const minimum = kind.requiredParams;
    const maximum = kind.requiredParams + kind.optionalParams;
    if (args.length < minimum || args.length > maximum) {
      throw new DomainError(`invalid number of parameters for ${type}`);
    }
    return kind.fromArgs(id, args);
  }

  createFromAttributes(
    type: string,
    id: string,
    attrs: AttributeMap,
    text: string | null,
  ): Shape {
    const kind = this.kinds.get(type);
    if (kind === undefined) {
      throw new DomainError(`unknown shape type: ${type} (is the plugin loaded?)`);
    }
    return kind.fromAttributes(id, attrs, text);
  }
}
