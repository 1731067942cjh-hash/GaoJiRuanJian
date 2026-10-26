import { HELP_LINES } from '../../view/HelpText';
import { ShowRenderer } from '../../view/ShowRenderer';
import { TreeRenderer } from '../../view/TreeRenderer';
import type { CommandMap } from './CommandDefinition';
import { CommandArguments } from './CommandArguments';

export class ViewCommands {
  register(commands: CommandMap): void {
    commands.set('tree', {
      requiresDocument: true,
      run: (session, args) => {
        CommandArguments.requireCount(args, 0, 1, 'tree [id]');
        const document = session.requireDocument();
        const renderer = new TreeRenderer();
        if (args.length === 0) {
          return renderer.render(document);
        }
        return renderer.renderSubtree(session.resolveShape(args[0]));
      },
    });

    commands.set('show', {
      requiresDocument: true,
      run: (session, args) => {
        CommandArguments.requireCount(args, 1, 1, 'show <id>');
        const shape = session.resolveShape(args[0]);
        return new ShowRenderer().render(shape);
      },
    });

    commands.set('help', {
      requiresDocument: false,
      run: (_session, args) => {
        CommandArguments.requireCount(args, 0, 0, 'help');
        return [...HELP_LINES];
      },
    });
  }
}
