import { DomainError } from '../../domain/errors/DomainError';

/** Shared syntax validation; domain validation belongs to the model. */
export class CommandArguments {
  static requireCount(args: readonly string[], minimum: number, maximum: number, usage: string): void {
    if (args.length < minimum || args.length > maximum) {
      throw new DomainError(`usage: ${usage}`);
    }
  }
}
