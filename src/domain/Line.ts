import { formatNumber, parseNumber } from './NumberFormat';
import {
  Shape,
  geometryNumber,
  numericAttribute,
  type AttributeMap,
  type GeometryRecord,
} from './Shape';
import type { ShapeVisitor } from './ShapeVisitor';
import type { Matrix } from './Transform';

const GEOMETRY_ATTRIBUTES = new Set(['x1', 'y1', 'x2', 'y2']);

export class Line extends Shape {
  static readonly type = 'line';
  static readonly requiredParams = 4;
  static readonly optionalParams = 1;

  private _x1: number;
  private _y1: number;
  private _x2: number;
  private _y2: number;

  constructor(
    id: string,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    stroke?: string,
  ) {
    super(id);
    this._x1 = x1;
    this._y1 = y1;
    this._x2 = x2;
    this._y2 = y2;
    if (stroke !== undefined) {
      this.setAttribute('stroke', stroke);
    }
  }

  readonly tag = 'line';

  static fromArgs(id: string, args: readonly string[]): Line {
    const stroke = args.length > 4 ? args[4] : undefined;
    return new Line(
      id,
      parseNumber(args[0], 'x1'),
      parseNumber(args[1], 'y1'),
      parseNumber(args[2], 'x2'),
      parseNumber(args[3], 'y2'),
      stroke,
    );
  }

  static fromAttributes(id: string, attrs: AttributeMap, _text: string | null): Line {
    const line = new Line(
      id,
      numericAttribute(attrs, 'x1'),
      numericAttribute(attrs, 'y1'),
      numericAttribute(attrs, 'x2'),
      numericAttribute(attrs, 'y2'),
    );
    line.loadCommonAttributes(attrs, GEOMETRY_ATTRIBUTES);
    return line;
  }

  get x1(): number {
    return this._x1;
  }

  get y1(): number {
    return this._y1;
  }

  get x2(): number {
    return this._x2;
  }

  get y2(): number {
    return this._y2;
  }

  override accept<T>(visitor: ShapeVisitor<T>): T {
    return visitor.visitLine(this);
  }

  override moveBy(dx: number, dy: number): void {
    this._x1 += dx;
    this._y1 += dy;
    this._x2 += dx;
    this._y2 += dy;
  }

  override scaleBy(factor: number): void {
    this._x1 *= factor;
    this._y1 *= factor;
    this._x2 *= factor;
    this._y2 *= factor;
  }

  override transformBy(matrix: Matrix): void {
    const { a, b, c, d, e, f } = matrix;
    const x1 = a * this._x1 + c * this._y1 + e;
    const y1 = b * this._x1 + d * this._y1 + f;
    const x2 = a * this._x2 + c * this._y2 + e;
    const y2 = b * this._x2 + d * this._y2 + f;
    this._x1 = x1;
    this._y1 = y1;
    this._x2 = x2;
    this._y2 = y2;
  }

  override readGeometry(): GeometryRecord {
    return { x1: this._x1, y1: this._y1, x2: this._x2, y2: this._y2 };
  }

  override writeGeometry(geometry: GeometryRecord): void {
    this._x1 = geometryNumber(geometry, 'x1');
    this._y1 = geometryNumber(geometry, 'y1');
    this._x2 = geometryNumber(geometry, 'x2');
    this._y2 = geometryNumber(geometry, 'y2');
  }

  override anchor(): { x: number; y: number } {
    return { x: this._x1, y: this._y1 };
  }

  override supportsAttribute(name: string): boolean {
    return GEOMETRY_ATTRIBUTES.has(name) || super.supportsAttribute(name);
  }

  override getAttribute(name: string): string | undefined {
    const common = super.getAttribute(name);
    if (common !== undefined) return common;
    if (name === 'x1') return formatNumber(this._x1);
    if (name === 'y1') return formatNumber(this._y1);
    if (name === 'x2') return formatNumber(this._x2);
    if (name === 'y2') return formatNumber(this._y2);
    return undefined;
  }

  override setAttribute(name: string, value: string): void {
    if (name === 'x1') {
      this._x1 = parseNumber(value, 'x1');
      return;
    }
    if (name === 'y1') {
      this._y1 = parseNumber(value, 'y1');
      return;
    }
    if (name === 'x2') {
      this._x2 = parseNumber(value, 'x2');
      return;
    }
    if (name === 'y2') {
      this._y2 = parseNumber(value, 'y2');
      return;
    }
    super.setAttribute(name, value);
  }
}
