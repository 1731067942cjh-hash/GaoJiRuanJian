import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Group } from '../../src/domain/Group';
import { Rect } from '../../src/domain/Rect';
import { ShapeFactory } from '../../src/shape/ShapeFactory';
import { SvgReader } from '../../src/serialization/SvgReader';
import { SvgWriter } from '../../src/serialization/SvgWriter';
import { XmldomTree } from '../../src/serialization/XmldomTree';

const fixture = readFileSync(new URL('../fixtures/other.svg', import.meta.url), 'utf8');

function reader(): SvgReader {
  return new SvgReader(new XmldomTree(), new ShapeFactory());
}

describe('SvgReader', () => {
  it('reads the spec fixture and warns about the missing id', () => {
    const result = reader().read(fixture);
    expect(result.warnings).toEqual(['assigned id rect1 to unnamed <rect>']);
    expect(result.document.width).toBe(400);
    expect(result.document.height).toBe(300);
    expect(result.document.elementCount).toBe(7);
    expect(result.document.children.map((shape) => shape.id)).toEqual([
      'rect1',
      't1',
      'c1',
      'g1',
      'e1',
    ]);
    const group = result.document.find('g1');
    expect(group).toBeInstanceOf(Group);
    expect((group as Group).children.map((shape) => shape.id)).toEqual(['r2', 'c2']);
  });

  it('bakes translate and scale transforms into coordinates', () => {
    const source = `<?xml version="1.0"?>
      <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
        <g transform="translate(10,20) scale(2)">
          <rect x="1" y="2" width="3" height="4"/>
        </g>
      </svg>`;
    const result = reader().read(source);
    const rect = result.document.find('rect1') as Rect;
    expect(rect.readGeometry()).toEqual({ x: 12, y: 24, width: 6, height: 8 });
  });

  it('warns and skips unsupported elements', () => {
    const source = `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10">
      <path d="M0 0"/>
      <rect id="r1" x="0" y="0" width="1" height="1"/>
    </svg>`;
    const result = reader().read(source);
    expect(result.warnings).toEqual(['unsupported element <path> skipped']);
    expect(result.document.elementCount).toBe(1);
  });

  it('rejects duplicate ids', () => {
    const source = `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10">
      <rect id="r1" x="0" y="0" width="1" height="1"/>
      <circle id="r1" cx="0" cy="0" r="1"/>
    </svg>`;
    expect(() => reader().read(source)).toThrow('duplicate id: r1');
  });

  it('rejects a non-svg root', () => {
    expect(() => reader().read('<html></html>')).toThrow('invalid svg: missing <svg> root');
  });

  it('preserves unknown attributes for round-tripping', () => {
    const source = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
      <text id="t1" x="10" y="20" font-size="16" text-anchor="middle">Hello &amp; bye</text>
    </svg>`;
    const result = reader().read(source);
    const text = result.document.find('t1');
    expect(text?.getExtra('font-size')).toBe('16');
    expect(text?.getExtra('text-anchor')).toBe('middle');

    const output = new SvgWriter().write(result.document);
    expect(output).toContain('font-size="16"');
    expect(output).toContain('text-anchor="middle"');
    expect(output).toContain('Hello &amp; bye');
  });
});

describe('SvgWriter', () => {
  it('round-trips the fixture without warnings', () => {
    const first = reader().read(fixture);
    const svg = new SvgWriter().write(first.document);
    expect(svg.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"');

    const second = reader().read(svg);
    expect(second.warnings).toEqual([]);
    expect(second.document.elementCount).toBe(first.document.elementCount);
    expect(second.document.width).toBe(400);
    expect(second.document.find('r2')?.parent?.id).toBe('g1');
  });

  it('writes empty groups as self-closing elements', () => {
    const result = reader().read(
      '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><g id="scene"/></svg>',
    );
    expect(new SvgWriter().write(result.document)).toContain('<g id="scene"/>');
  });

  it('escapes attribute values and text content', () => {
    const result = reader().read(
      '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><text id="t1" x="0" y="0">&lt;A&amp;B&gt;</text></svg>',
    );
    const svg = new SvgWriter().write(result.document);
    expect(svg).toContain('&lt;A&amp;B&gt;');
    const roundTrip = reader().read(svg).document.find('t1');
    expect(roundTrip?.getAttribute('text')).toBe('<A&B>');
  });
});
