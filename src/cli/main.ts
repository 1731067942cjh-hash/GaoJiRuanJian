import { NodeFileGateway } from '../io/NodeFileGateway';
import { ShapeFactory } from '../shape/ShapeFactory';
import { SvgReader } from '../serialization/SvgReader';
import { SvgWriter } from '../serialization/SvgWriter';
import { XmldomTree } from '../serialization/XmldomTree';
import { CommandDispatcher } from './CommandDispatcher';
import { CommandRegistry } from './CommandRegistry';
import { EditorSession } from './EditorSession';
import { runRepl } from './Repl';

async function main(): Promise<void> {
  const factory = new ShapeFactory();
  const session = new EditorSession(
    new NodeFileGateway(),
    factory,
    new SvgReader(new XmldomTree(), factory),
    new SvgWriter(),
  );
  const dispatcher = new CommandDispatcher(new CommandRegistry(), session);
  await runRepl(dispatcher, process.stdin, process.stdout);
}

await main();
