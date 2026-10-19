import { describe, expect, it } from 'vitest';
import { Circle } from '../../src/domain/Circle';
import { Document } from '../../src/domain/Document';
import { DomainError } from '../../src/domain/errors/DomainError';
import { Group } from '../../src/domain/Group';
import { IdAllocator } from '../../src/domain/IdAllocator';
import { Line } from '../../src/domain/Line';
import { formatNumber } from '../../src/domain/NumberFormat';
import { Rect } from '../../src/domain/Rect';
import { TextShape } from '../../src/domain/TextShape';
import { Transform } from '../../src/domain/Transform';

describe('Shape geometry', () => {
  it('moves and scales a rectangle around the origin', () => {
    const rect = new Rect('r1', 10, 20, 30, 40);
    rect.moveBy(5, 5);
    expect(rect.readGeometry()).toEqual({ x: 15, y: 25, width: 30, height: 40 });
    rect.scaleBy(2);
    expect(rect.readGeometry()).toEqual({ x: 30, y: 50, width: 60, height: 80 });
  });

  it('moves and scales every descendant of a group', () => {
    const group = new Group('g1');
    const rect = new Rect('r1', 10, 20, 30, 40);
    const circle = new Circle('c1', 5, 5, 2);
    group.appendChild(rect);
    group.appendChild(circle);

    group.moveBy(10, -5);
    expect(rect.readGeometry()).toEqual({ x: 20, y: 15, width: 30, height: 40 });
    expect(circle.readGeometry()).toEqual({ cx: 15, cy: 0, r: 2 });

    group.scaleBy(3);
    expect(rect.readGeometry()).toEqual({ x: 60, y: 45, width: 90, height: 120 });
    expect(circle.readGeometry()).toEqual({ cx: 45, cy: 0, r: 6 });
  });

  it('applies an affine transform to a line', () => {
    const line = new Line('l1', 0, 0, 10, 0);
    const parsed = Transform.parse('translate(5,5) scale(2)');
    line.transformBy(parsed.matrix);
    expect(line.readGeometry()).toEqual({ x1: 5, y1: 5, x2: 25, y2: 5 });
    expect(parsed.unsupported).toEqual([]);
  });

  it('reports unsupported transform functions', () => {
    const parsed = Transform.parse('rotate(45) translate(1,2)');
    expect(parsed.unsupported).toEqual(['rotate']);
    expect(parsed.matrix).toEqual({ a: 1, b: 0, c: 0, d: 1, e: 1, f: 2 });
  });

  it('keeps text coordinates and scales a preserved font-size', () => {
    const text = new TextShape('t1', 10, 20, 'hello');
    text.setExtra('font-size', '16');
    text.transformBy(Transform.parse('scale(2)').matrix);
    expect(text.readGeometry()).toEqual({ x: 20, y: 40 });
    expect(text.getExtra('font-size')).toBe('32');
  });
});

describe('Document', () => {
  it('finds shapes recursively and does not expose the root', () => {
    const doc = new Document(800, 600);
    const group = new Group('g1');
    const rect = new Rect('r1', 0, 0, 10, 10);
    group.appendChild(rect);
    doc.appendChild(group);

    expect(doc.find('r1')).toBe(rect);
    expect(doc.find('g1')).toBe(group);
    expect(doc.find('svg')).toBeUndefined();
    expect(doc.elementCount).toBe(2);
  });

  it('rejects invalid canvas sizes', () => {
    expect(() => new Document(0, 600)).toThrow(DomainError);
    expect(() => new Document(800, Number.NaN)).toThrow(DomainError);
  });
});

describe('attributes', () => {
  it('handles common and geometric attributes uniformly', () => {
    const rect = new Rect('r1', 0, 0, 10, 10);
    expect(rect.supportsAttribute('fill')).toBe(true);
    expect(rect.supportsAttribute('width')).toBe(true);
    expect(rect.supportsAttribute('cx')).toBe(false);
    rect.setAttribute('fill', 'red');
    rect.setAttribute('width', '20');
    expect(rect.getAttribute('fill')).toBe('red');
    expect(rect.getAttribute('width')).toBe('20');
    rect.clearAttribute('fill');
    expect(rect.getAttribute('fill')).toBeUndefined();
  });

  it('updates text content through the text pseudo-attribute', () => {
    const text = new TextShape('t1', 0, 0, 'old');
    text.setAttribute('text', 'new');
    expect(text.content).toBe('new');
    expect(text.getAttribute('text')).toBe('new');
  });

  it('rejects attributes outside the whitelist', () => {
    const rect = new Rect('r1', 0, 0, 10, 10);
    expect(() => rect.setAttribute('opacity', '0.5')).toThrow('unknown attribute: opacity');
  });
});

describe('formatting and ids', () => {
  it('formats numbers without floating point noise', () => {
    expect(formatNumber(0.1 + 0.2)).toBe('0.3');
    expect(formatNumber(130)).toBe('130');
    expect(formatNumber(-0)).toBe('0');
    expect(formatNumber(1.5)).toBe('1.5');
  });

  it('allocates the next free tag-based id', () => {
    const ids = new IdAllocator(['rect1']);
    expect(ids.assign('rect')).toBe('rect2');
    ids.reserve('rect2');
    expect(ids.assign('rect')).toBe('rect3');
    expect(ids.assign('g')).toBe('g1');
  });
});
