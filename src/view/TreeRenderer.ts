import { Circle } from '../domain/Circle';
import { Container } from '../domain/Container';
import type { Document } from '../domain/Document';
import { Ellipse } from '../domain/Ellipse';
import { Group } from '../domain/Group';
import { Line } from '../domain/Line';
import { formatNumber } from '../domain/NumberFormat';
import { Rect } from '../domain/Rect';
import type { Shape } from '../domain/Shape';
import type { ShapeVisitor } from '../domain/ShapeVisitor';
import { TextShape } from '../domain/TextShape';

interface NodeInfo {
  readonly name: string;
  readonly details: string;
}

interface Entry {
  readonly prefix: string;
  readonly info: NodeInfo;
}

/**
 * Renders the `tree` command. Attributes are aligned to the longest
 * "indent + name" pair in the rendered subtree (the spec's own samples use
 * column 19 for two different trees; the sixth section sample is internally
 * inconsistent, so one deterministic rule is used and documented).
 */
export class TreeRenderer implements ShapeVisitor<NodeInfo> {
  render(document: Document): string[] {
    const entries: Entry[] = [];
    this.collect(document.children, '', entries);
    const header = `svg (${formatNumber(document.width)}x${formatNumber(document.height)})`;
    return [header, ...this.format(entries)];
  }

  renderSubtree(root: Shape): string[] {
    const entries: Entry[] = [{ prefix: '', info: root.accept(this) }];
    if (root instanceof Container) {
      this.collect(root.children, '', entries);
    }
    return this.format(entries);
  }

  private collect(children: readonly Shape[], ancestor: string, entries: Entry[]): void {
    children.forEach((child, index) => {
      const last = index === children.length - 1;
      const connector = last ? '└── ' : '├── ';
      const nextAncestor = ancestor + (last ? '    ' : '│   ');
      entries.push({ prefix: ancestor + connector, info: child.accept(this) });
      if (child instanceof Container) {
        this.collect(child.children, nextAncestor, entries);
      }
    });
  }

  private format(entries: readonly Entry[]): string[] {
    if (entries.length === 0) {
      return [];
    }
    const column =
      Math.max(...entries.map((entry) => entry.prefix.length + entry.info.name.length)) + 2;
    return entries.map((entry) => {
      if (entry.info.details.length === 0) {
        return entry.prefix + entry.info.name;
      }
      const padding = ' '.repeat(
        Math.max(1, column - entry.prefix.length - entry.info.name.length),
      );
      return `${entry.prefix}${entry.info.name}${padding}${entry.info.details}`;
    });
  }

  /** The tree shows fill only; full style details belong to `show`. */
  private style(shape: Shape): string[] {
    return shape.fill === undefined ? [] : [`fill=${shape.fill}`];
  }

  visitDocument(document: Document): NodeInfo {
    return { name: 'svg', details: `(${formatNumber(document.width)}x${formatNumber(document.height)})` };
  }

  visitGroup(group: Group): NodeInfo {
    return { name: group.ref, details: this.style(group).join(' ') };
  }

  visitRect(rect: Rect): NodeInfo {
    const parts = [
      `x=${formatNumber(rect.x)}`,
      `y=${formatNumber(rect.y)}`,
      `w=${formatNumber(rect.width)}`,
      `h=${formatNumber(rect.height)}`,
      ...this.style(rect),
    ];
    return { name: rect.ref, details: parts.join(' ') };
  }

  visitCircle(circle: Circle): NodeInfo {
    const parts = [
      `cx=${formatNumber(circle.cx)}`,
      `cy=${formatNumber(circle.cy)}`,
      `r=${formatNumber(circle.r)}`,
      ...this.style(circle),
    ];
    return { name: circle.ref, details: parts.join(' ') };
  }

  visitEllipse(ellipse: Ellipse): NodeInfo {
    const parts = [
      `cx=${formatNumber(ellipse.cx)}`,
      `cy=${formatNumber(ellipse.cy)}`,
      `rx=${formatNumber(ellipse.rx)}`,
      `ry=${formatNumber(ellipse.ry)}`,
      ...this.style(ellipse),
    ];
    return { name: ellipse.ref, details: parts.join(' ') };
  }

  visitLine(line: Line): NodeInfo {
    const parts = [
      `(${formatNumber(line.x1)},${formatNumber(line.y1)}) -> (${formatNumber(line.x2)},${formatNumber(line.y2)})`,
      ...this.style(line),
    ];
    return { name: line.ref, details: parts.join(' ') };
  }

  visitText(text: TextShape): NodeInfo {
    const parts = [
      `(${formatNumber(text.x)},${formatNumber(text.y)})`,
      JSON.stringify(text.content),
      ...this.style(text),
    ];
    return { name: text.ref, details: parts.join(' ') };
  }
}
