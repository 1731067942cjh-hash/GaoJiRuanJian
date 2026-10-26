import { NodeFileGateway } from '../io/NodeFileGateway';
import { ShapeFactory } from '../shape/ShapeFactory';
import { SvgReader } from '../serialization/SvgReader';
import { SvgWriter } from '../serialization/SvgWriter';
import { XmldomTree } from '../serialization/XmldomTree';
import { CommandDispatcher } from './CommandDispatcher';
import { CommandRegistry } from './CommandRegistry';
import { EditorSession } from './EditorSession';
import { Repl } from './Repl';

const factory = new ShapeFactory();
const session = new EditorSession(
  new NodeFileGateway(),
  factory,
  new SvgReader(new XmldomTree(), factory),
  new SvgWriter(),
);
const dispatcher = new CommandDispatcher(new CommandRegistry(), session);
await new Repl().run(dispatcher, process.stdin, process.stdout);
