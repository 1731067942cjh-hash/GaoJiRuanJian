import { Circle } from '../domain/Circle';
import type { Document } from '../domain/Document';
import { Ellipse } from '../domain/Ellipse';
import type { Group } from '../domain/Group';
import { Line } from '../domain/Line';
import { formatNumber } from '../domain/NumberFormat';
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
    const width = formatNumber(document.width);
    const height = formatNumber(document.height);
    this.lines.push('<?xml version="1.0" encoding="UTF-8"?>');
    this.lines.push(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
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
      ['x', formatNumber(rect.x)],
      ['y', formatNumber(rect.y)],
      ['width', formatNumber(rect.width)],
      ['height', formatNumber(rect.height)],
    ]);
    this.lines.push(`${this.indent()}<rect ${attributes}/>`);
  }

  visitCircle(circle: Circle): void {
    const attributes = this.attributes(circle, [
      ['cx', formatNumber(circle.cx)],
      ['cy', formatNumber(circle.cy)],
      ['r', formatNumber(circle.r)],
    ]);
    this.lines.push(`${this.indent()}<circle ${attributes}/>`);
  }

  visitEllipse(ellipse: Ellipse): void {
    const attributes = this.attributes(ellipse, [
      ['cx', formatNumber(ellipse.cx)],
      ['cy', formatNumber(ellipse.cy)],
      ['rx', formatNumber(ellipse.rx)],
      ['ry', formatNumber(ellipse.ry)],
    ]);
    this.lines.push(`${this.indent()}<ellipse ${attributes}/>`);
  }

  visitLine(line: Line): void {
    const attributes = this.attributes(line, [
      ['x1', formatNumber(line.x1)],
      ['y1', formatNumber(line.y1)],
      ['x2', formatNumber(line.x2)],
      ['y2', formatNumber(line.y2)],
    ]);
    this.lines.push(`${this.indent()}<line ${attributes}/>`);
  }

  visitText(text: TextShape): void {
    const attributes = this.attributes(text, [
      ['x', formatNumber(text.x)],
      ['y', formatNumber(text.y)],
    ]);
    if (text.content.length === 0) {
      this.lines.push(`${this.indent()}<text ${attributes}/>`);
      return;
    }
    this.lines.push(
      `${this.indent()}<text ${attributes}>${escapeText(text.content)}</text>`,
    );
  }

  private attributes(shape: Shape, geometry: ReadonlyArray<readonly [string, string]>): string {
    const pairs: Array<readonly [string, string]> = [['id', shape.id], ...geometry];
    if (shape.fill !== undefined) pairs.push(['fill', shape.fill]);
    if (shape.stroke !== undefined) pairs.push(['stroke', shape.stroke]);
    if (shape.strokeWidth !== undefined) pairs.push(['stroke-width', shape.strokeWidth]);
    for (const [name, value] of shape.extras) {
      pairs.push([name, value]);
    }
    return pairs.map(([name, value]) => `${name}="${escapeAttribute(value)}"`).join(' ');
  }

  private indent(): string {
    return '  '.repeat(this.depth);
  }
}

function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
