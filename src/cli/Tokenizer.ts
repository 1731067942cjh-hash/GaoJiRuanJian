import { DomainError } from '../domain/errors/DomainError';

/**
 * Splits a REPL line into tokens. Double quotes group whitespace; a backslash
 * escapes the next character inside quotes. Lines whose first non-space
 * character is `#` are comments.
 */
export class Tokenizer {
  tokenize(line: string): string[] {
    if (line.trimStart().startsWith('#')) {
      return [];
    }

    const tokens: string[] = [];
    let current = '';
    let inQuotes = false;
    let hasContent = false;

    for (let index = 0; index < line.length; index += 1) {
      const character = line[index];

      if (inQuotes) {
        if (character === '\\') {
          const escaped = line[index + 1];
          if (escaped === undefined) {
            throw new DomainError('unterminated quote');
          }
          current += unescape(escaped);
          index += 1;
        } else if (character === '"') {
          inQuotes = false;
        } else {
          current += character;
        }
        continue;
      }

      if (character === '"') {
        inQuotes = true;
        hasContent = true;
        continue;
      }
      if (/\s/.test(character)) {
        if (hasContent) {
          tokens.push(current);
          current = '';
          hasContent = false;
        }
        continue;
      }
      current += character;
      hasContent = true;
    }

    if (inQuotes) {
      throw new DomainError('unterminated quote');
    }
    if (hasContent) {
      tokens.push(current);
    }
    return tokens;
  }
}

function unescape(character: string): string {
  if (character === 'n') return '\n';
  if (character === 't') return '\t';
  return character;
}
