import { NumberFormat } from './NumberFormat';
import {
  Shape,
  type AttributeMap,
  type GeometryRecord,
} from './Shape';
import type { ShapeVisitor } from './ShapeVisitor';
import type { Matrix } from './Transform';

const GEOMETRY_ATTRIBUTES = new Set(['cx', 'cy', 'r']);

export class Circle extends Shape {
  static readonly type = 'circle';
  static readonly requiredParams = 3;
  static readonly optionalParams = 1;

  private _cx: number;
  private _cy: number;
  private _r: number;

  constructor(id: string, cx: number, cy: number, r: number, fill?: string) {
    super(id);
    this._cx = cx;
    this._cy = cy;
    this._r = r;
    if (fill !== undefined) {
      this.setAttribute('fill', fill);
    }
  }

  readonly tag = 'circle';

  static fromArgs(id: string, args: readonly string[]): Circle {
    const fill = args.length > 3 ? args[3] : undefined;
    return new Circle(
      id,
      NumberFormat.parse(args[0], 'cx'),
      NumberFormat.parse(args[1], 'cy'),
      NumberFormat.parse(args[2], 'r'),
      fill,
    );
  }

  static fromAttributes(id: string, attrs: AttributeMap, _text: string | null): Circle {
    const circle = new Circle(
      id,
      this.numericAttribute(attrs, 'cx'),
      this.numericAttribute(attrs, 'cy'),
      this.numericAttribute(attrs, 'r'),
    );
    circle.loadCommonAttributes(attrs, GEOMETRY_ATTRIBUTES);
    return circle;
  }

  get cx(): number {
    return this._cx;
  }

  get cy(): number {
    return this._cy;
  }

  get r(): number {
    return this._r;
  }

  override accept<T>(visitor: ShapeVisitor<T>): T {
    return visitor.visitCircle(this);
  }

  override moveBy(dx: number, dy: number): void {
    this._cx += dx;
    this._cy += dy;
  }

  override scaleBy(factor: number): void {
    this._cx *= factor;
    this._cy *= factor;
    this._r *= factor;
  }

  override transformBy(matrix: Matrix): void {
    const { a, b, c, d, e, f } = matrix;
    const cx = a * this._cx + c * this._cy + e;
    const cy = b * this._cx + d * this._cy + f;
    this._cx = cx;
    this._cy = cy;
    this._r *= Math.sqrt(Math.abs(a * d - b * c));
  }

  override readGeometry(): GeometryRecord {
    return { cx: this._cx, cy: this._cy, r: this._r };
  }

  override writeGeometry(geometry: GeometryRecord): void {
    this._cx = this.geometryNumber(geometry, 'cx');
    this._cy = this.geometryNumber(geometry, 'cy');
    this._r = this.geometryNumber(geometry, 'r');
  }

  override anchor(): { x: number; y: number } {
    return { x: this._cx, y: this._cy };
  }

  override supportsAttribute(name: string): boolean {
    return GEOMETRY_ATTRIBUTES.has(name) || super.supportsAttribute(name);
  }

  override getAttribute(name: string): string | undefined {
    const common = super.getAttribute(name);
    if (common !== undefined) return common;
    if (name === 'cx') return NumberFormat.format(this._cx);
    if (name === 'cy') return NumberFormat.format(this._cy);
    if (name === 'r') return NumberFormat.format(this._r);
    return undefined;
  }

  override setAttribute(name: string, value: string): void {
    if (name === 'cx') {
      this._cx = NumberFormat.parse(value, 'cx');
      return;
    }
    if (name === 'cy') {
      this._cy = NumberFormat.parse(value, 'cy');
      return;
    }
    if (name === 'r') {
      this._r = NumberFormat.parse(value, 'r');
      return;
    }
    super.setAttribute(name, value);
  }
}
