import { Circle } from '../domain/Circle';
import type { Document } from '../domain/Document';
import { Ellipse } from '../domain/Ellipse';
import { Group } from '../domain/Group';
import { Line } from '../domain/Line';
import { formatNumber } from '../domain/NumberFormat';
import { Rect } from '../domain/Rect';
import type { Shape } from '../domain/Shape';
import type { ShapeVisitor } from '../domain/ShapeVisitor';
import { TextShape } from '../domain/TextShape';

/** Renders the `show` command: one header line plus indented detail lines. */
export class ShowRenderer implements ShapeVisitor<string[]> {
  render(shape: Shape): string[] {
    const parent = shape.parent;
    const parentLabel =
      parent === null ? 'none' : parent instanceof Group ? parent.ref : parent.tag;
    return [`${shape.ref}  parent=${parentLabel}`, ...shape.accept(this).map((line) => `  ${line}`)];
  }

  visitDocument(_document: Document): string[] {
    return [];
  }

  visitGroup(group: Group): string[] {
    return [`children=${group.children.length}`, ...this.style(group)];
  }

  visitRect(rect: Rect): string[] {
    return [
      `x=${formatNumber(rect.x)} y=${formatNumber(rect.y)} width=${formatNumber(rect.width)} height=${formatNumber(rect.height)}`,
      ...this.style(rect),
      ...this.extras(rect),
    ];
  }

  visitCircle(circle: Circle): string[] {
    return [
      `cx=${formatNumber(circle.cx)} cy=${formatNumber(circle.cy)} r=${formatNumber(circle.r)}`,
      ...this.style(circle),
      ...this.extras(circle),
    ];
  }

  visitEllipse(ellipse: Ellipse): string[] {
    return [
      `cx=${formatNumber(ellipse.cx)} cy=${formatNumber(ellipse.cy)} rx=${formatNumber(ellipse.rx)} ry=${formatNumber(ellipse.ry)}`,
      ...this.style(ellipse),
      ...this.extras(ellipse),
    ];
  }

  visitLine(line: Line): string[] {
    return [
      `x1=${formatNumber(line.x1)} y1=${formatNumber(line.y1)} x2=${formatNumber(line.x2)} y2=${formatNumber(line.y2)}`,
      ...this.style(line),
      ...this.extras(line),
    ];
  }

  visitText(text: TextShape): string[] {
    return [
      `x=${formatNumber(text.x)} y=${formatNumber(text.y)}`,
      ...this.style(text),
      `text=${JSON.stringify(text.content)}`,
      ...this.extras(text),
    ];
  }

  private style(shape: Shape): string[] {
    const parts: string[] = [];
    if (shape.fill !== undefined) parts.push(`fill=${shape.fill}`);
    if (shape.stroke !== undefined) parts.push(`stroke=${shape.stroke}`);
    if (shape.strokeWidth !== undefined) parts.push(`stroke-width=${shape.strokeWidth}`);
    return parts.length === 0 ? [] : [parts.join(' ')];
  }

  private extras(shape: Shape): string[] {
    if (shape.extras.size === 0) return [];
    return [[...shape.extras].map(([name, value]) => `${name}=${value}`).join(' ')];
  }
}
