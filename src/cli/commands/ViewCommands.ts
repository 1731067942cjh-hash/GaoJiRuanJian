import { HELP_LINES } from '../../view/HelpText';
import { ShowRenderer } from '../../view/ShowRenderer';
import { TreeRenderer } from '../../view/TreeRenderer';
import type { CommandMap } from './CommandDefinition';
import { requireArgumentCount, requireDocument, resolveShape } from './helpers';

export function registerViewCommands(commands: CommandMap): void {
  commands.set('tree', {
    requiresDocument: true,
    run: (session, args) => {
      requireArgumentCount(args, 0, 1, 'tree [id]');
      const document = requireDocument(session);
      const renderer = new TreeRenderer();
      if (args.length === 0) {
        return renderer.render(document);
      }
      return renderer.renderSubtree(resolveShape(session, args[0]));
    },
  });

  commands.set('show', {
    requiresDocument: true,
    run: (session, args) => {
      requireArgumentCount(args, 1, 1, 'show <id>');
      const shape = resolveShape(session, args[0]);
      return new ShowRenderer().render(shape);
    },
  });

  commands.set('help', {
    requiresDocument: false,
    run: (_session, args) => {
      requireArgumentCount(args, 0, 0, 'help');
      return [...HELP_LINES];
    },
  });
}
