import { Tokenizer } from './Tokenizer';

export interface ParsedCommand {
  readonly name: string;
  readonly args: readonly string[];
}

export class CommandParser {
  constructor(private readonly tokenizer: Tokenizer = new Tokenizer()) {}

  parse(line: string): ParsedCommand | null {
    const tokens = this.tokenizer.tokenize(line);
    if (tokens.length === 0) {
      return null;
    }
    return { name: tokens[0], args: tokens.slice(1) };
  }
}
