import type { EditorSession } from '../EditorSession';

export type CommandHandler = (
  session: EditorSession,
  args: readonly string[],
) => Promise<string[]> | string[];

export interface CommandDefinition {
  readonly requiresDocument: boolean;
  readonly run: CommandHandler;
}

export type CommandMap = Map<string, CommandDefinition>;
