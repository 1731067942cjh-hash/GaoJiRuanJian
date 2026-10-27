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

describe('SvgReader edge cases', () => {
  it('preserves the root viewport, inherited styles and metadata on round-trip', () => {
    const source = '<svg xmlns="http://www.w3.org/2000/svg" id="drawing" width="400px" height="200" viewBox="10 20 100 50" fill="red" stroke="blue" preserveAspectRatio="xMinYMin meet"><rect id="r" width="10" height="20"/></svg>';
    const first = reader().read(source);
    const output = new SvgWriter().write(first.document);
    expect(output).toContain('viewBox="10 20 100 50"');
    expect(output).toContain('id="drawing"');
    expect(output).toContain('fill="red"');
    expect(output).toContain('stroke="blue"');
    expect(output).toContain('preserveAspectRatio="xMinYMin meet"');
    const second = reader().read(output);
    expect(second.warnings).toEqual([]);
    expect(new SvgWriter().write(second.document)).toBe(output);
    second.document.resize(800, 600);
    expect(new SvgWriter().write(second.document)).toContain('viewBox="0 0 800 600"');
  });

  it('reserves ids even on skipped elements when assigning missing ids', () => {
    const result = reader().read('<svg><rect/><path id="rect1"/></svg>');
    expect(result.document.find('rect2')?.tag).toBe('rect');
    expect(result.warnings).toContain('assigned id rect2 to unnamed <rect>');
  });

  it.each([
    '<svg><g id=unquoted/></svg>',
    '<svg><rect id="r" width="1"/></svg>garbage',
  ])('rejects XML that would otherwise be silently repaired: %s', source => {
    expect(() => reader().read(source)).toThrow();
  });

  it.each(['-1', '0', '100oops', '50%', 'NaN'])('rejects an invalid explicit canvas width: %s', width => {
    expect(() => reader().read(`<svg width="${width}"/>`)).toThrow();
  });

  it.each(['1 2 0 10', 'oops 2 10 10', '0 0 10', '0 0 1e309 20'])('rejects an invalid viewBox: %s', viewBox => {
    expect(() => reader().read(`<svg viewBox="${viewBox}"/>`)).toThrow();
  });

  it('rejects geometry overflow caused by an imported transform', () => {
    expect(() => reader().read('<svg><rect id="r" x="1e308" width="1" height="1" transform="scale(2)"/></svg>')).toThrow('geometry must remain finite');
  });

  it('preserves XML attribute whitespace and text carriage returns', () => {
    const source = '<svg><text id="t" data-note="a&#9;b&#10;c&#13;d">A&#13;B</text></svg>';
    const first = reader().read(source);
    const second = reader().read(new SvgWriter().write(first.document));
    expect(second.document.find('t')?.getExtra('data-note')).toBe('a\tb\nc\rd');
    expect(second.document.find('t')?.getAttribute('text')).toBe('A\rB');
  });

  it('falls back to viewBox or defaults', () => {
    const fromViewBox = reader().read(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100"><g id="g1"/></svg>',
    );
    expect(fromViewBox.document.width).toBe(200);
    expect(fromViewBox.document.height).toBe(100);

    const defaults = reader().read(
      '<svg xmlns="http://www.w3.org/2000/svg"><g id="g1"/></svg>',
    );
    expect(defaults.document.width).toBe(800);
    expect(defaults.document.height).toBe(600);
  });

  it('avoids explicit ids that appear later in the file', () => {
    const result = reader().read(
      '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="1" height="1"/><rect id="rect1" width="1" height="1"/></svg>',
    );
    expect(result.warnings).toEqual(['assigned id rect2 to unnamed <rect>']);
    expect(result.document.find('rect1')?.id).toBe('rect1');
    expect(result.document.find('rect2')?.id).toBe('rect2');
  });

  it('composes nested group transforms', () => {
    const result = reader().read(
      `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
        <g transform="translate(10,20)">
          <g transform="scale(2)">
            <rect id="r1" x="1" y="1" width="2" height="2"/>
          </g>
        </g>
      </svg>`,
    );
    const rect = result.document.find('r1') as Rect;
    expect(rect.readGeometry()).toEqual({ x: 12, y: 22, width: 4, height: 4 });
  });

  it('rejects malformed XML', () => {
    expect(() => reader().read('<svg><rect></svg>')).toThrow();
  });
});
