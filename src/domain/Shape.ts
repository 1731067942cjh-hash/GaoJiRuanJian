import type { Container } from './Container';
import type { ShapeVisitor } from './ShapeVisitor';
import type { Matrix } from './Transform';
import { DomainError } from './errors/DomainError';
import { formatNumber, parseNumber } from './NumberFormat';

/** Attributes of an element as read from an SVG file. */
export type AttributeMap = ReadonlyMap<string, string>;

/** Numeric geometry of a shape, keyed by SVG attribute name. */
export type GeometryRecord = Record<string, number>;

/**
 * Metadata a shape class exposes to the shape factory. This is the only
 * "type name -> class" dispatch point in the program (together with the
 * command registry).
 */
export interface ShapeKind<T extends Shape = Shape> {
  readonly type: string;
  readonly requiredParams: number;
  readonly optionalParams: number;
  fromArgs(id: string, args: readonly string[]): T;
  fromAttributes(id: string, attrs: AttributeMap, text: string | null): T;
}

const COMMON_ATTRIBUTES = new Set(['fill', 'stroke', 'stroke-width']);

/**
 * Base class of every graphical element. Concrete subclasses own their
 * geometry, while common style attributes live here.
 */
export abstract class Shape {
  readonly id: string;
  parent: Container | null = null;

  private _fill: string | undefined;
  private _stroke: string | undefined;
  private _strokeWidth: string | undefined;
  private readonly _extras = new Map<string, string>();

  protected constructor(id: string) {
    if (id.length === 0 || /\s/.test(id)) {
      throw new DomainError('id must be non-empty and contain no whitespace');
    }
    this.id = id;
  }

  /** SVG tag name. Used for messages, reading and writing. */
  abstract readonly tag: string;

  get ref(): string {
    return `${this.tag}#${this.id}`;
  }

  abstract accept<T>(visitor: ShapeVisitor<T>): T;
  abstract moveBy(dx: number, dy: number): void;
  abstract scaleBy(factor: number): void;
  abstract transformBy(matrix: Matrix): void;
  abstract readGeometry(): GeometryRecord;
  abstract writeGeometry(geometry: GeometryRecord): void;
  abstract anchor(): { x: number; y: number } | null;

  get fill(): string | undefined {
    return this._fill;
  }

  get stroke(): string | undefined {
    return this._stroke;
  }

  get strokeWidth(): string | undefined {
    return this._strokeWidth;
  }

  /** Attributes preserved verbatim for round-tripping (font-size, style, ...). */
  get extras(): ReadonlyMap<string, string> {
    return this._extras;
  }

  getExtra(name: string): string | undefined {
    return this._extras.get(name);
  }

  setExtra(name: string, value: string): void {
    this._extras.set(name, value);
  }

  supportsAttribute(name: string): boolean {
    return COMMON_ATTRIBUTES.has(name);
  }

  getAttribute(name: string): string | undefined {
    if (name === 'fill') return this._fill;
    if (name === 'stroke') return this._stroke;
    if (name === 'stroke-width') return this._strokeWidth;
    return undefined;
  }

  setAttribute(name: string, value: string): void {
    if (name === 'fill') {
      this._fill = value;
      return;
    }
    if (name === 'stroke') {
      this._stroke = value;
      return;
    }
    if (name === 'stroke-width') {
      this._strokeWidth = value;
      return;
    }
    throw new DomainError(`unknown attribute: ${name}`);
  }

  clearAttribute(name: string): void {
    if (name === 'fill') {
      this._fill = undefined;
      return;
    }
    if (name === 'stroke') {
      this._stroke = undefined;
      return;
    }
    if (name === 'stroke-width') {
      this._strokeWidth = undefined;
      return;
    }
    throw new DomainError(`unknown attribute: ${name}`);
  }

  /**
   * Load common style attributes and keep every unknown attribute in an
   * "extras" bag so that reading and saving an SVG does not silently drop
   * attributes the editor does not model yet.
   */
  protected loadCommonAttributes(attrs: AttributeMap, known: ReadonlySet<string>): void {
    for (const name of COMMON_ATTRIBUTES) {
      const value = attrs.get(name);
      if (value !== undefined) {
        this.setAttribute(name, value);
      }
    }
    for (const [name, value] of attrs) {
      if (name === 'id' || name === 'transform') continue;
      if (COMMON_ATTRIBUTES.has(name) || known.has(name)) continue;
      this._extras.set(name, value);
    }
  }
}

/** Read a numeric attribute, defaulting to 0 when it is absent. */
export function numericAttribute(attrs: AttributeMap, name: string, fallback = 0): number {
  const raw = attrs.get(name);
  return raw === undefined ? fallback : parseNumber(raw, name);
}

/** Read a numeric field from a geometry snapshot written by a shape. */
export function geometryNumber(geometry: GeometryRecord, name: string): number {
  const value = geometry[name];
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new DomainError(`invalid geometry value: ${name}`);
  }
  return value;
}

/** Format a geometry value for display and serialization. */
export function geometryText(value: number): string {
  return formatNumber(value);
}
