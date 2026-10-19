/** Affine matrix in SVG order: [a b c d e f]. */
export interface Matrix {
  readonly a: number;
  readonly b: number;
  readonly c: number;
  readonly d: number;
  readonly e: number;
  readonly f: number;
}

export const IDENTITY: Matrix = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

/**
 * Transform support is intentionally small: `translate` and `scale` are baked
 * into coordinates so that the model only stores absolute geometry. Anything
 * else is reported to the caller (and ignored) instead of being mis-rendered.
 */
export class Transform {
  static multiply(left: Matrix, right: Matrix): Matrix {
    return {
      a: left.a * right.a + left.c * right.b,
      b: left.b * right.a + left.d * right.b,
      c: left.a * right.c + left.c * right.d,
      d: left.b * right.c + left.d * right.d,
      e: left.a * right.e + left.c * right.f + left.e,
      f: left.b * right.e + left.d * right.f + left.f,
    };
  }

  static isIdentity(matrix: Matrix): boolean {
    return (
      approximately(matrix.a, 1) &&
      approximately(matrix.b, 0) &&
      approximately(matrix.c, 0) &&
      approximately(matrix.d, 1) &&
      approximately(matrix.e, 0) &&
      approximately(matrix.f, 0)
    );
  }

  /**
   * Parse a transform list. The returned `unsupported` array contains the
   * function names that could not be applied, so the reader can warn the user.
   */
  static parse(value: string): { matrix: Matrix; unsupported: string[] } {
    let matrix = IDENTITY;
    const unsupported: string[] = [];
    const pattern = /([a-zA-Z]+)\s*\(([^)]*)\)/g;
    let match: RegExpExecArray | null = pattern.exec(value);
    let sawFunction = false;

    while (match !== null) {
      sawFunction = true;
      const name = match[1].toLowerCase();
      const numbers = match[2]
        .split(/[\s,]+/)
        .filter((part) => part.length > 0)
        .map(Number);

      if (numbers.some((number) => !Number.isFinite(number))) {
        unsupported.push(name);
        match = pattern.exec(value);
        continue;
      }

      if (name === 'translate') {
        const tx = numbers[0] ?? 0;
        const ty = numbers[1] ?? 0;
        matrix = Transform.multiply(matrix, { a: 1, b: 0, c: 0, d: 1, e: tx, f: ty });
      } else if (name === 'scale') {
        const sx = numbers[0] ?? 1;
        const sy = numbers[1] ?? sx;
        matrix = Transform.multiply(matrix, { a: sx, b: 0, c: 0, d: sy, e: 0, f: 0 });
      } else if (name === 'matrix' && numbers.length === 6) {
        const candidate: Matrix = {
          a: numbers[0],
          b: numbers[1],
          c: numbers[2],
          d: numbers[3],
          e: numbers[4],
          f: numbers[5],
        };
        if (approximately(candidate.b, 0) && approximately(candidate.c, 0)) {
          matrix = Transform.multiply(matrix, candidate);
        } else {
          unsupported.push('matrix (rotation/skew)');
        }
      } else {
        unsupported.push(name);
      }

      match = pattern.exec(value);
    }

    if (!sawFunction && value.trim().length > 0) {
      unsupported.push(value.trim());
    }

    return { matrix, unsupported };
  }
}

function approximately(value: number, expected: number): boolean {
  return Math.abs(value - expected) < 1e-9;
}
