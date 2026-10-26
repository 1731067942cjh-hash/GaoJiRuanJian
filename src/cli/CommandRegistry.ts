import { DomainError } from '../domain/errors/DomainError';
import type { EditorSession } from './EditorSession';
import { DocumentCommands } from './commands/DocumentCommands';
import { EditCommands } from './commands/EditCommands';
import { ViewCommands } from './commands/ViewCommands';
import type { CommandDefinition, CommandMap } from './commands/CommandDefinition';

/**
 * The only "command name -> implementation" dispatch point.
 *
 * @todo Plugin stage: commands should be contributed through a registry too,
 * instead of being registered from three fixed modules.
 */
export class CommandRegistry {
  private readonly commands: CommandMap = new Map();

  constructor() {
    new DocumentCommands().register(this.commands);
    new EditCommands().register(this.commands);
    new ViewCommands().register(this.commands);
  }

  has(name: string): boolean {
    return this.commands.has(name);
  }

  definition(name: string): CommandDefinition | undefined {
    return this.commands.get(name);
  }

  async run(
    session: EditorSession,
    name: string,
    args: readonly string[],
  ): Promise<string[]> {
    const definition = this.commands.get(name);
    if (definition === undefined) {
      throw new DomainError(`unknown command: ${name}`);
    }
    if (definition.requiresDocument) {
      session.requireDocument();
    }
    return definition.run(session, args);
  }
}
