import { NumberFormat } from '../../domain/NumberFormat';
import type { CommandMap } from './CommandDefinition';
import { CommandArguments } from './CommandArguments';

/** Registers the document commands; EditorSession owns their lifecycle. */
export class DocumentCommands {
  register(commands: CommandMap): void {
    commands.set('init', {
      requiresDocument: false,
      run: (session, args) => {
        CommandArguments.requireCount(args, 0, 2, 'init [w] [h]');
        const width = args.length >= 1 ? NumberFormat.parse(args[0], 'width') : 800;
        const height = args.length === 2 ? NumberFormat.parse(args[1], 'height') : 600;
        session.init(width, height);
        return [`canvas ${NumberFormat.format(width)}x${NumberFormat.format(height)} created`];
      },
    });
    commands.set('read', {
      requiresDocument: false,
      run: async (session, args) => {
        CommandArguments.requireCount(args, 1, 1, 'read <file.svg>');
        const path = args[0];
        const result = await session.read(path);
        return [
          ...result.warnings.map(warning => `warning: ${warning}`),
          `read ${path} (${result.document.elementCount} elements)`,
        ];
      },
    });
    commands.set('save', {
      requiresDocument: true,
      run: async (session, args) => {
        CommandArguments.requireCount(args, 0, 1, 'save [file.svg]');
        const path = await session.save(args[0]);
        return [`saved to ${path} (${session.requireDocument().elementCount} elements)`];
      },
    });
    commands.set('canvas', {
      requiresDocument: true,
      run: (session, args) => {
        const document = session.requireDocument();
        if (args.length === 0) {
          return [`canvas ${NumberFormat.format(document.width)}x${NumberFormat.format(document.height)}`];
        }
        CommandArguments.requireCount(args, 2, 2, 'canvas [w] [h]');
        const width = NumberFormat.parse(args[0], 'width');
        const height = NumberFormat.parse(args[1], 'height');
        session.resize(width, height);
        return [`canvas resized to ${NumberFormat.format(width)}x${NumberFormat.format(height)}`];
      },
    });
  }
}
