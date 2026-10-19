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
import { parseNumber } from '../../domain/NumberFormat';
import type { CommandMap } from './CommandDefinition';
import {
  requireArgumentCount,
  requireDocument,
  resolveGroup,
  resolveShape,
} from './helpers';

export function registerEditCommands(commands: CommandMap): void {
  commands.set('create', {
    requiresDocument: true,
    run: (session, args) => {
      const document = requireDocument(session);
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
      if (id === 'svg' || document.find(id) !== undefined) {
        throw new DomainError(`id already exists: ${id}`);
      }

      let rest = args.slice(2);
      let containerId: string | undefined;
      if (rest.length >= 2 && rest[rest.length - 2] === 'in') {
        containerId = rest[rest.length - 1];
        rest = rest.slice(0, -2);
      }
      const parent = containerId === undefined ? document : resolveGroup(session, containerId);
      const shape = session.factory.createFromArgs(type, id, rest);
      return [session.history.run(new CreateCommand(shape, parent), document)];
    },
  });

  commands.set('delete', {
    requiresDocument: true,
    run: (session, args) => {
      requireArgumentCount(args, 1, 1, 'delete <id>');
      const document = requireDocument(session);
      const shape = resolveShape(session, args[0]);
      return [session.history.run(new DeleteCommand(shape), document)];
    },
  });

  commands.set('move', {
    requiresDocument: true,
    run: (session, args) => {
      requireArgumentCount(args, 3, 3, 'move <id> <dx> <dy>');
      const document = requireDocument(session);
      const shape = resolveShape(session, args[0]);
      const dx = parseNumber(args[1], 'dx');
      const dy = parseNumber(args[2], 'dy');
      return [session.history.run(new MoveCommand(shape, dx, dy), document)];
    },
  });

  commands.set('scale', {
    requiresDocument: true,
    run: (session, args) => {
      requireArgumentCount(args, 2, 2, 'scale <id> <factor>');
      const document = requireDocument(session);
      const shape = resolveShape(session, args[0]);
      const factor = parseNumber(args[1], 'factor');
      return [session.history.run(new ScaleCommand(shape, factor), document)];
    },
  });

  commands.set('set', {
    requiresDocument: true,
    run: (session, args) => {
      requireArgumentCount(args, 3, 3, 'set <id> <attr> <value>');
      const document = requireDocument(session);
      const shape = resolveShape(session, args[0]);
      return [
        session.history.run(new SetCommand(shape, args[1], args[2]), document),
      ];
    },
  });

  commands.set('group', {
    requiresDocument: true,
    run: (session, args) => {
      if (args.length < 3) {
        throw new DomainError('usage: group <newGid> <id1> <id2>...');
      }
      const document = requireDocument(session);
      const targets = args.slice(1).map((id) => resolveShape(session, id));
      return [
        session.history.run(new GroupCommand(args[0], targets), document),
      ];
    },
  });

  commands.set('ungroup', {
    requiresDocument: true,
    run: (session, args) => {
      requireArgumentCount(args, 1, 1, 'ungroup <gid>');
      const document = requireDocument(session);
      const shape = resolveShape(session, args[0]);
      if (!(shape instanceof Group)) {
        throw new DomainError(`not a container: ${args[0]}`);
      }
      return [session.history.run(new UngroupCommand(shape), document)];
    },
  });

  commands.set('addto', {
    requiresDocument: true,
    run: (session, args) => {
      requireArgumentCount(args, 2, 2, 'addto <gid> <id>');
      const document = requireDocument(session);
      const target = resolveGroup(session, args[0]);
      const shape = resolveShape(session, args[1]);
      return [session.history.run(new AddToCommand(shape, target), document)];
    },
  });

  commands.set('front', {
    requiresDocument: true,
    run: (session, args) => {
      requireArgumentCount(args, 1, 1, 'front <id>');
      const document = requireDocument(session);
      const shape = resolveShape(session, args[0]);
      return [session.history.run(new ReorderCommand(shape, true), document)];
    },
  });

  commands.set('back', {
    requiresDocument: true,
    run: (session, args) => {
      requireArgumentCount(args, 1, 1, 'back <id>');
      const document = requireDocument(session);
      const shape = resolveShape(session, args[0]);
      return [session.history.run(new ReorderCommand(shape, false), document)];
    },
  });

  commands.set('undo', {
    requiresDocument: true,
    run: (session, args) => {
      requireArgumentCount(args, 0, 0, 'undo');
      return [session.history.undo(requireDocument(session))];
    },
  });

  commands.set('redo', {
    requiresDocument: true,
    run: (session, args) => {
      requireArgumentCount(args, 0, 0, 'redo');
      return [session.history.redo(requireDocument(session))];
    },
  });
}
