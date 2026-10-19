import { DomainError } from '../domain/errors/DomainError';
import type { EditorSession } from './EditorSession';
import { registerDocumentCommands } from './commands/DocumentCommands';
import { registerEditCommands } from './commands/EditCommands';
import { registerViewCommands } from './commands/ViewCommands';
import type { CommandDefinition, CommandMap } from './commands/CommandDefinition';
import { requireDocument } from './commands/helpers';

/**
 * The only "command name -> implementation" dispatch point.
 *
 * @todo Plugin stage: commands should be contributed through a registry too,
 * instead of being registered from three fixed modules.
 */
export class CommandRegistry {
  private readonly commands: CommandMap = new Map();

  constructor() {
    registerDocumentCommands(this.commands);
    registerEditCommands(this.commands);
    registerViewCommands(this.commands);
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
      requireDocument(session);
    }
    return definition.run(session, args);
  }
}
