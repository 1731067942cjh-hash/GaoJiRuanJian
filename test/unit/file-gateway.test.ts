import { mkdtemp, readFile, readdir, rm, stat, symlink, writeFile, rename, lstat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NodeFileGateway } from '../../src/io/NodeFileGateway';
import { EditorSession } from '../../src/cli/EditorSession';
import { CommandDispatcher } from '../../src/cli/CommandDispatcher';
import { CommandRegistry } from '../../src/cli/CommandRegistry';
import { ShapeFactory } from '../../src/shape/ShapeFactory';
import { SvgReader } from '../../src/serialization/SvgReader';
import { SvgWriter } from '../../src/serialization/SvgWriter';
import { XmldomTree } from '../../src/serialization/XmldomTree';

vi.mock('node:fs/promises', async importOriginal => {
  const actual = await importOriginal<typeof import('node:fs/promises')>();
  return { ...actual, rename: vi.fn(actual.rename) };
});

const directories: string[] = [];
async function directory(): Promise<string> {
  const path = await mkdtemp(join(tmpdir(), 'svg-gateway-'));
  directories.push(path);
  return path;
}

afterEach(async () => {
  vi.mocked(rename).mockReset();
  const actual = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises');
  vi.mocked(rename).mockImplementation(actual.rename);
  await Promise.all(directories.splice(0).map(path => rm(path, { recursive: true, force: true })));
});

describe('atomic SVG file writes', () => {
  it('keeps the saved path and editing history when the real gateway fails', async () => {
    const folder = await directory();
    const factory = new ShapeFactory();
    const session = new EditorSession(new NodeFileGateway(), factory,
      new SvgReader(new XmldomTree(), factory), new SvgWriter());
    const cli = new CommandDispatcher(new CommandRegistry(), session);
    const originalPath = join(folder, 'original.svg');
    const failedPath = join(folder, 'failed.svg');
    await cli.execute('init');
    await cli.execute('create g scene');
    await cli.execute(`save "${originalPath}"`);
    const original = await readFile(originalPath, 'utf8');
    await cli.execute('create rect r 1 2 3 4 in scene');
    vi.mocked(rename).mockRejectedValueOnce(new Error('simulated replacement failure'));
    expect(await cli.execute(`save "${failedPath}"`)).toEqual([`error: cannot write file: ${failedPath}`]);
    expect(await readFile(originalPath, 'utf8')).toBe(original);
    expect(await cli.execute('undo')).toEqual(['rect#r deleted']);
    expect(await cli.execute('save')).toEqual([`saved to ${originalPath} (1 elements)`]);
    expect(await readdir(folder)).toEqual(['original.svg']);
  });

  it('writes and reads Unicode contents through a path containing spaces', async () => {
    const folder = await directory();
    const path = join(folder, '我的 图形.svg');
    const gateway = new NodeFileGateway();
    await gateway.writeText(path, '<svg><text>开始</text></svg>');
    expect(await gateway.readText(path)).toBe('<svg><text>开始</text></svg>');
    expect(await readdir(folder)).toEqual(['我的 图形.svg']);
  });

  it('replaces a complete existing file and preserves its permissions', async () => {
    const folder = await directory();
    const path = join(folder, 'drawing.svg');
    await writeFile(path, 'old contents', { mode: 0o640 });
    await new NodeFileGateway().writeText(path, 'new contents');
    expect(await readFile(path, 'utf8')).toBe('new contents');
    expect((await stat(path)).mode & 0o777).toBe(0o640);
    expect(await readdir(folder)).toEqual(['drawing.svg']);
  });

  it('keeps the old file intact and removes temporary files when replacement fails', async () => {
    const folder = await directory();
    const path = join(folder, 'drawing.svg');
    await writeFile(path, 'original SVG');
    vi.mocked(rename).mockRejectedValueOnce(new Error('simulated replacement failure'));
    await expect(new NodeFileGateway().writeText(path, 'replacement SVG')).rejects.toThrow();
    expect(await readFile(path, 'utf8')).toBe('original SVG');
    expect(await readdir(folder)).toEqual(['drawing.svg']);
  });

  it('leaves no destination or temporary files when saving a new file fails', async () => {
    const folder = await directory();
    vi.mocked(rename).mockRejectedValueOnce(new Error('simulated replacement failure'));
    await expect(new NodeFileGateway().writeText(join(folder, 'new.svg'), 'SVG')).rejects.toThrow();
    expect(await readdir(folder)).toEqual([]);
  });

  it('updates a symlink target without replacing the symlink itself', async () => {
    const folder = await directory();
    const target = join(folder, 'target.svg');
    const link = join(folder, 'link.svg');
    await writeFile(target, 'old');
    await symlink(target, link);
    await new NodeFileGateway().writeText(link, 'new');
    expect((await lstat(link)).isSymbolicLink()).toBe(true);
    expect(await readFile(target, 'utf8')).toBe('new');
    expect((await readdir(folder)).sort()).toEqual(['link.svg', 'target.svg']);
  });
});
