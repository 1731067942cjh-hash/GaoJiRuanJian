import type { Circle } from './Circle';
import type { Document } from './Document';
import type { Ellipse } from './Ellipse';
import type { Group } from './Group';
import type { Line } from './Line';
import type { Rect } from './Rect';
import type { TextShape } from './TextShape';

/**
 * Double-dispatch visitor used by the text views and the SVG writer. The
 * domain model itself never imports a renderer.
 */
export interface ShapeVisitor<T> {
  visitDocument(shape: Document): T;
  visitGroup(shape: Group): T;
  visitRect(shape: Rect): T;
  visitCircle(shape: Circle): T;
  visitEllipse(shape: Ellipse): T;
  visitLine(shape: Line): T;
  visitText(shape: TextShape): T;
}
