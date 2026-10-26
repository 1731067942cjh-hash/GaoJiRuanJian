import { NumberFormat } from './NumberFormat';
import {
  Shape,
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
      NumberFormat.parse(args[0], 'x1'),
      NumberFormat.parse(args[1], 'y1'),
      NumberFormat.parse(args[2], 'x2'),
      NumberFormat.parse(args[3], 'y2'),
      stroke,
    );
  }

  static fromAttributes(id: string, attrs: AttributeMap, _text: string | null): Line {
    const line = new Line(
      id,
      this.numericAttribute(attrs, 'x1'),
      this.numericAttribute(attrs, 'y1'),
      this.numericAttribute(attrs, 'x2'),
      this.numericAttribute(attrs, 'y2'),
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
    this._x1 = this.geometryNumber(geometry, 'x1');
    this._y1 = this.geometryNumber(geometry, 'y1');
    this._x2 = this.geometryNumber(geometry, 'x2');
    this._y2 = this.geometryNumber(geometry, 'y2');
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
    if (name === 'x1') return NumberFormat.format(this._x1);
    if (name === 'y1') return NumberFormat.format(this._y1);
    if (name === 'x2') return NumberFormat.format(this._x2);
    if (name === 'y2') return NumberFormat.format(this._y2);
    return undefined;
  }

  override setAttribute(name: string, value: string): void {
    if (name === 'x1') {
      this._x1 = NumberFormat.parse(value, 'x1');
      return;
    }
    if (name === 'y1') {
      this._y1 = NumberFormat.parse(value, 'y1');
      return;
    }
    if (name === 'x2') {
      this._x2 = NumberFormat.parse(value, 'x2');
      return;
    }
    if (name === 'y2') {
      this._y2 = NumberFormat.parse(value, 'y2');
      return;
    }
    super.setAttribute(name, value);
  }
}
