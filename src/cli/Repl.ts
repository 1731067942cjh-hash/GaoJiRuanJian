import { createInterface } from 'node:readline';
import type { CommandDispatcher } from './CommandDispatcher';

/**
 * Line-oriented REPL. Prompts and the banner are shown only on a TTY so that
 * piping a command script produces clean, diff-able output.
 */
export class Repl {
  async run(
    dispatcher: CommandDispatcher,
    input: NodeJS.ReadableStream,
    output: NodeJS.WritableStream,
  ): Promise<void> {
    const interactive = Boolean((input as NodeJS.ReadStream).isTTY);
    const readline = createInterface({ input, output, terminal: interactive });

    if (interactive) {
      output.write("svg-editor 0.1 — type 'help' for commands\n\n");
      readline.setPrompt('svg> ');
      readline.prompt();
    }

    for await (const line of readline) {
      const lines = await dispatcher.execute(line);
      for (const entry of lines) {
        output.write(`${entry}\n`);
      }
      if (interactive) {
        readline.prompt();
      }
    }

    if (interactive) {
      output.write('\n');
    }
    readline.close();
  }
}
