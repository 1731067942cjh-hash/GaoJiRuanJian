import { PassThrough } from 'node:stream';
import { expect, it } from 'vitest';
import { Repl } from '../../src/cli/Repl';
import { CommandDispatcher } from '../../src/cli/CommandDispatcher';
import { CommandRegistry } from '../../src/cli/CommandRegistry';
import { EditorSession } from '../../src/cli/EditorSession';
import { ShapeFactory } from '../../src/shape/ShapeFactory';
import { SvgReader } from '../../src/serialization/SvgReader';
import { SvgWriter } from '../../src/serialization/SvgWriter';
import { XmldomTree } from '../../src/serialization/XmldomTree';

it('drains pasted interactive commands after Ctrl+D without prompting a closed readline', async () => {
  const factory = new ShapeFactory();
  const session = new EditorSession({
    async readText() { throw new Error('unused'); },
    async writeText() { throw new Error('unused'); },
  }, factory, new SvgReader(new XmldomTree(), factory), new SvgWriter());
  const input = Object.assign(new PassThrough(), { isTTY: true });
  const output = new PassThrough();
  let transcript = '';
  output.on('data', chunk => { transcript += String(chunk); });
  const done = new Repl().run(new CommandDispatcher(new CommandRegistry(), session), input, output);
  input.end('init 320\ncreate g scene\ncreate rect r 10 20 100 50 red in scene\nmove scene 5 0\nundo\ntree\n\u0004');
  await expect(done).resolves.toBeUndefined();
  expect(transcript).toContain('svg>');
  expect(transcript).toContain('svg (320x600)');
  expect(session.document?.find('r')?.getAttribute('x')).toBe('10');
});
