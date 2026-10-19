import { DomainError } from '../domain/errors/DomainError';
import { CommandParser } from './CommandParser';
import type { CommandRegistry } from './CommandRegistry';
import type { EditorSession } from './EditorSession';

/** Parses one line, runs the command and converts failures to `error:` lines. */
export class CommandDispatcher {
  private readonly parser = new CommandParser();

  constructor(
    private readonly registry: CommandRegistry,
    private readonly session: EditorSession,
  ) {}

  async execute(line: string): Promise<string[]> {
    try {
      const parsed = this.parser.parse(line);
      if (parsed === null) {
        return [];
      }
      return await this.registry.run(this.session, parsed.name, parsed.args);
    } catch (error) {
      if (error instanceof DomainError) {
        return [`error: ${error.message}`];
      }
      return [`error: ${error instanceof Error ? error.message : String(error)}`];
    }
  }
}
