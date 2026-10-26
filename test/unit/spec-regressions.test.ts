import { describe, expect, it } from 'vitest';
import { CommandDispatcher } from '../../src/cli/CommandDispatcher';
import { CommandRegistry } from '../../src/cli/CommandRegistry';
import { EditorSession } from '../../src/cli/EditorSession';
import { Container } from '../../src/domain/Container';
import { SvgReader } from '../../src/serialization/SvgReader';
import { SvgWriter } from '../../src/serialization/SvgWriter';
import { XmldomTree } from '../../src/serialization/XmldomTree';
import { ShapeFactory } from '../../src/shape/ShapeFactory';

function editor() {
  const files = new Map<string, string>();
  const factory = new ShapeFactory();
  const reader = new SvgReader(new XmldomTree(), factory);
  const writer = new SvgWriter();
  const session = new EditorSession({
    async readText(path) {
      const source = files.get(path);
      if (source === undefined) throw new Error('missing file');
      return source;
    },
    async writeText(path, source) { files.set(path, source); },
  }, factory, reader, writer);
  const dispatcher = new CommandDispatcher(new CommandRegistry(), session);
  return { files, session, reader, writer, run: (line: string) => dispatcher.execute(line) };
}

describe('specification regressions', () => {
  it('preserves sibling order when group arguments are reversed, including redo', async () => {
    const e = editor();
    await e.run('init');
    for (const id of ['a', 'middle', 'b']) await e.run(`create g ${id}`);
    await e.run('group bundle b a');
    const children = () => (e.session.document?.find('bundle') as Container).children.map(s => s.id);
    expect(children()).toEqual(['a', 'b']);
    await e.run('undo');
    expect(e.session.document?.children.map(s => s.id)).toEqual(['a', 'middle', 'b']);
    await e.run('redo');
    expect(children()).toEqual(['a', 'b']);
  });

  it('preserves document order across different parents and restores all positions', async () => {
    const e = editor();
    await e.run('init');
    for (const id of ['left', 'right']) await e.run(`create g ${id}`);
    await e.run('create g a in left');
    await e.run('create g b in right');
    const before = await e.run('tree');
    await e.run('group bundle b a');
    expect((e.session.document?.find('bundle') as Container).children.map(s => s.id)).toEqual(['a', 'b']);
    await e.run('undo');
    expect(await e.run('tree')).toEqual(before);
  });

  it('rejects an empty group id before detaching any children or clearing redo', async () => {
    const e = editor();
    await e.run('init');
    for (const id of ['a', 'b', 'c']) await e.run(`create g ${id}`);
    await e.run('undo');
    const before = await e.run('tree');
    expect((await e.run('group "" a b'))[0]).toMatch(/^error:/);
    expect(await e.run('tree')).toEqual(before);
    expect(await e.run('redo')).toEqual(['g#c created']);
  });

  it('allows svg as a user id because the root has no public id', async () => {
    const e = editor();
    await e.run('init');
    expect(await e.run('create g svg')).toEqual(['g#svg created']);
    expect(await e.run('create g svg')).toEqual(['error: id already exists: svg']);
  });

  it('defaults only the omitted height for init [w] [h]', async () => {
    const e = editor();
    expect(await e.run('init 320')).toEqual(['canvas 320x600 created']);
  });

  it('does not trim text on save/read, including whitespace-only content', async () => {
    const e = editor();
    await e.run('init');
    await e.run('create text title 0 0 "  hello  "');
    await e.run('create text blank 0 0 "   "');
    await e.run('save text.svg');
    await e.run('read text.svg');
    expect(e.session.document?.find('title')?.getAttribute('text')).toBe('  hello  ');
    expect(e.session.document?.find('blank')?.getAttribute('text')).toBe('   ');
  });

  it('preserves precision and exponent values through set/undo and save/read', async () => {
    const e = editor();
    await e.run('init');
    await e.run('create rect r 0.12345678901234567 1e-10 1e30 1e308');
    const before = e.session.document?.find('r')?.readGeometry();
    await e.run('set r x 10');
    await e.run('undo');
    expect(e.session.document?.find('r')?.readGeometry()).toEqual(before);
    await e.run('save precision.svg');
    expect(await e.run('read precision.svg')).toEqual(['read precision.svg (1 elements)']);
    expect(e.session.document?.find('r')?.readGeometry()).toEqual(before);
  });

  it.each(['move bundle 1e308 0', 'scale bundle 2'])('rolls back overflowing geometry: %s', async command => {
    const e = editor();
    await e.run('init');
    await e.run('create g bundle');
    await e.run('create rect small 1 2 3 4 in bundle');
    await e.run('create rect huge 1e308 2 3 4 in bundle');
    const before = e.session.document?.allShapes().map(s => s.readGeometry());
    expect((await e.run(command))[0]).toMatch(/^error:/);
    expect(e.session.document?.allShapes().map(s => s.readGeometry())).toEqual(before);
    expect(await e.run('undo')).toEqual(['rect#huge deleted']);
  });

  it('rejects an empty numeric argument instead of silently assigning zero', async () => {
    const e = editor();
    await e.run('init');
    await e.run('create rect r 1 2 3 4');
    expect((await e.run('set r x ""'))[0]).toMatch(/^error:/);
    expect(e.session.document?.find('r')?.getAttribute('x')).toBe('1');
  });

  it('reports errors as a single line even when quoted arguments contain escapes', async () => {
    const e = editor();
    await e.run('init');
    const output = await e.run('delete "missing\\nshape"');
    expect(output).toHaveLength(1);
    expect(output[0]).toMatch(/^error:/);
    expect(output[0]).not.toMatch(/[\r\n]/);
  });
});
