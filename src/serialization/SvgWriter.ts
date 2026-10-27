import { Circle } from '../domain/Circle';
import type { Document } from '../domain/Document';
import { Ellipse } from '../domain/Ellipse';
import type { Group } from '../domain/Group';
import { Line } from '../domain/Line';
import { NumberFormat } from '../domain/NumberFormat';
import { Rect } from '../domain/Rect';
import type { Shape } from '../domain/Shape';
import type { ShapeVisitor } from '../domain/ShapeVisitor';
import type { TextShape } from '../domain/TextShape';

/**
 * Serializes the model to SVG. Attribute order is deterministic (id, geometry,
 * style, preserved extras) so golden files stay stable.
 */
export class SvgWriter implements ShapeVisitor<void> {
  private readonly lines: string[] = [];
  private depth = 0;

  write(document: Document): string {
    this.lines.length = 0;
    this.depth = 0;
    document.accept(this);
    return `${this.lines.join('\n')}\n`;
  }

  visitDocument(document: Document): void {
    const width = NumberFormat.format(document.width);
    const height = NumberFormat.format(document.height);
    const viewBox = document.viewBox.map(value => NumberFormat.format(value)).join(' ');
    const metadata = this.attributes(document, [], document.svgId ?? null);
    this.lines.push('<?xml version="1.0" encoding="UTF-8"?>');
    this.lines.push(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${viewBox}"${metadata.length === 0 ? '' : ` ${metadata}`}>`,
    );
    this.depth = 1;
    for (const child of document.children) {
      child.accept(this);
    }
    this.lines.push('</svg>');
  }

  visitGroup(group: Group): void {
    const attributes = this.attributes(group, []);
    if (group.children.length === 0) {
      this.lines.push(`${this.indent()}<g ${attributes}/>`);
      return;
    }
    this.lines.push(`${this.indent()}<g ${attributes}>`);
    this.depth += 1;
    for (const child of group.children) {
      child.accept(this);
    }
    this.depth -= 1;
    this.lines.push(`${this.indent()}</g>`);
  }

  visitRect(rect: Rect): void {
    const attributes = this.attributes(rect, [
      ['x', NumberFormat.format(rect.x)],
      ['y', NumberFormat.format(rect.y)],
      ['width', NumberFormat.format(rect.width)],
      ['height', NumberFormat.format(rect.height)],
    ]);
    this.lines.push(`${this.indent()}<rect ${attributes}/>`);
  }

  visitCircle(circle: Circle): void {
    const attributes = this.attributes(circle, [
      ['cx', NumberFormat.format(circle.cx)],
      ['cy', NumberFormat.format(circle.cy)],
      ['r', NumberFormat.format(circle.r)],
    ]);
    this.lines.push(`${this.indent()}<circle ${attributes}/>`);
  }

  visitEllipse(ellipse: Ellipse): void {
    const attributes = this.attributes(ellipse, [
      ['cx', NumberFormat.format(ellipse.cx)],
      ['cy', NumberFormat.format(ellipse.cy)],
      ['rx', NumberFormat.format(ellipse.rx)],
      ['ry', NumberFormat.format(ellipse.ry)],
    ]);
    this.lines.push(`${this.indent()}<ellipse ${attributes}/>`);
  }

  visitLine(line: Line): void {
    const attributes = this.attributes(line, [
      ['x1', NumberFormat.format(line.x1)],
      ['y1', NumberFormat.format(line.y1)],
      ['x2', NumberFormat.format(line.x2)],
      ['y2', NumberFormat.format(line.y2)],
    ]);
    this.lines.push(`${this.indent()}<line ${attributes}/>`);
  }

  visitText(text: TextShape): void {
    const attributes = this.attributes(text, [
      ['x', NumberFormat.format(text.x)],
      ['y', NumberFormat.format(text.y)],
    ]);
    if (text.content.length === 0) {
      this.lines.push(`${this.indent()}<text ${attributes}/>`);
      return;
    }
    this.lines.push(
      `${this.indent()}<text ${attributes}>${this.escapeText(text.content)}</text>`,
    );
  }

  private attributes(shape: Shape, geometry: ReadonlyArray<readonly [string, string]>, id: string | null = shape.id): string {
    const pairs: Array<readonly [string, string]> = [...geometry];
    if (id !== null) pairs.unshift(['id', id]);
    if (shape.fill !== undefined) pairs.push(['fill', shape.fill]);
    if (shape.stroke !== undefined) pairs.push(['stroke', shape.stroke]);
    if (shape.strokeWidth !== undefined) pairs.push(['stroke-width', shape.strokeWidth]);
    for (const [name, value] of shape.extras) {
      pairs.push([name, value]);
    }
    return pairs.map(([name, value]) => `${name}="${this.escapeAttribute(value)}"`).join(' ');
  }

  private indent(): string {
    return '  '.repeat(this.depth);
  }

  private escapeAttribute(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/\t/g, '&#9;')
      .replace(/\n/g, '&#10;')
      .replace(/\r/g, '&#13;');
  }

  private escapeText(value: string): string {
    return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\r/g, '&#13;');
  }
}
