/**
 * An error caused by an invalid user request. The CLI prints its message with
 * the `error:` prefix and leaves the document untouched.
 */
export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainError';
  }
}
