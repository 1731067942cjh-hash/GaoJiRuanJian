/**
 * Allocates ids for elements imported from external SVG files. The generated
 * name follows the spec: `<tag><number>`, e.g. `rect1`, `g2`.
 */
export class IdAllocator {
  private readonly taken: Set<string>;

  constructor(initial: Iterable<string> = []) {
    this.taken = new Set(initial);
  }

  isTaken(id: string): boolean {
    return this.taken.has(id);
  }

  reserve(id: string): void {
    this.taken.add(id);
  }

  assign(tag: string): string {
    let index = 1;
    while (this.taken.has(`${tag}${index}`)) {
      index += 1;
    }
    const id = `${tag}${index}`;
    this.taken.add(id);
    return id;
  }
}
