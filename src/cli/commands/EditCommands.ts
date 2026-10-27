import { AddToCommand } from '../../command/AddToCommand';
import { CreateCommand } from '../../command/CreateCommand';
import { DeleteCommand } from '../../command/DeleteCommand';
import { GroupCommand } from '../../command/GroupCommand';
import { MoveCommand } from '../../command/MoveCommand';
import { ReorderCommand } from '../../command/ReorderCommand';
import { ScaleCommand } from '../../command/ScaleCommand';
import { SetCommand } from '../../command/SetCommand';
import { UngroupCommand } from '../../command/UngroupCommand';
import { DomainError } from '../../domain/errors/DomainError';
import { Group } from '../../domain/Group';
import { NumberFormat } from '../../domain/NumberFormat';
import type { CommandMap } from './CommandDefinition';
import { CommandArguments } from './CommandArguments';

export class EditCommands {
  register(commands: CommandMap): void {
    commands.set('create', {
      requiresDocument: true,
      run: (session, args) => {
        const document = session.requireDocument();
        if (args.length < 2) {
          throw new DomainError(
            'usage: create <type> <id> [params...] [in <containerId>]',
          );
        }
        const type = args[0];
        const id = args[1];
        if (!session.factory.has(type)) {
          throw new DomainError(`unknown shape type: ${type} (is the plugin loaded?)`);
        }
        if (document.hasId(id)) {
          throw new DomainError(`id already exists: ${id}`);
        }

        let rest = args.slice(2);
        let containerId: string | undefined;
        if (rest.length >= 2 && rest[rest.length - 2] === 'in') {
          containerId = rest[rest.length - 1];
          rest = rest.slice(0, -2);
        }
        const parent = containerId === undefined ? document : session.resolveGroup(containerId);
        const shape = session.factory.createFromArgs(type, id, rest);
        return [session.execute(new CreateCommand(shape, parent))];
      },
    });

    commands.set('delete', {
      requiresDocument: true,
      run: (session, args) => {
        CommandArguments.requireCount(args, 1, 1, 'delete <id>');
        const shape = session.resolveShape(args[0]);
        return [session.execute(new DeleteCommand(shape))];
      },
    });

    commands.set('move', {
      requiresDocument: true,
      run: (session, args) => {
        CommandArguments.requireCount(args, 3, 3, 'move <id> <dx> <dy>');
        const shape = session.resolveShape(args[0]);
        const dx = NumberFormat.parse(args[1], 'dx');
        const dy = NumberFormat.parse(args[2], 'dy');
        return [session.execute(new MoveCommand(shape, dx, dy))];
      },
    });

    commands.set('scale', {
      requiresDocument: true,
      run: (session, args) => {
        CommandArguments.requireCount(args, 2, 2, 'scale <id> <factor>');
        const shape = session.resolveShape(args[0]);
        const factor = NumberFormat.parse(args[1], 'factor');
        return [session.execute(new ScaleCommand(shape, factor))];
      },
    });

    commands.set('set', {
      requiresDocument: true,
      run: (session, args) => {
        CommandArguments.requireCount(args, 3, 3, 'set <id> <attr> <value>');
        const shape = session.resolveShape(args[0]);
        return [
          session.execute(new SetCommand(shape, args[1], args[2])),
        ];
      },
    });

    commands.set('group', {
      requiresDocument: true,
      run: (session, args) => {
        if (args.length < 3) {
          throw new DomainError('usage: group <newGid> <id1> <id2>...');
        }
        const targets = args.slice(1).map((id) => session.resolveShape(id));
        return [
          session.execute(new GroupCommand(args[0], targets)),
        ];
      },
    });

    commands.set('ungroup', {
      requiresDocument: true,
      run: (session, args) => {
        CommandArguments.requireCount(args, 1, 1, 'ungroup <gid>');
        const shape = session.resolveShape(args[0]);
        if (!(shape instanceof Group)) {
          throw new DomainError(`not a container: ${args[0]}`);
        }
        return [session.execute(new UngroupCommand(shape))];
      },
    });

    commands.set('addto', {
      requiresDocument: true,
      run: (session, args) => {
        CommandArguments.requireCount(args, 2, 2, 'addto <gid> <id>');
        const target = session.resolveGroup(args[0]);
        const shape = session.resolveShape(args[1]);
        return [session.execute(new AddToCommand(shape, target))];
      },
    });

    commands.set('front', {
      requiresDocument: true,
      run: (session, args) => {
        CommandArguments.requireCount(args, 1, 1, 'front <id>');
        const shape = session.resolveShape(args[0]);
        return [session.execute(new ReorderCommand(shape, true))];
      },
    });

    commands.set('back', {
      requiresDocument: true,
      run: (session, args) => {
        CommandArguments.requireCount(args, 1, 1, 'back <id>');
        const shape = session.resolveShape(args[0]);
        return [session.execute(new ReorderCommand(shape, false))];
      },
    });

    commands.set('undo', {
      requiresDocument: true,
      run: (session, args) => {
        CommandArguments.requireCount(args, 0, 0, 'undo');
        return [session.undo()];
      },
    });

    commands.set('redo', {
      requiresDocument: true,
      run: (session, args) => {
        CommandArguments.requireCount(args, 0, 0, 'redo');
        return [session.redo()];
      },
    });
  }
}
