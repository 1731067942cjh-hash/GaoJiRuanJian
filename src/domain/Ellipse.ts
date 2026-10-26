import { NumberFormat } from './NumberFormat';
import {
  Shape,
  type AttributeMap,
  type GeometryRecord,
} from './Shape';
import type { ShapeVisitor } from './ShapeVisitor';
import type { Matrix } from './Transform';

const GEOMETRY_ATTRIBUTES = new Set(['cx', 'cy', 'rx', 'ry']);

export class Ellipse extends Shape {
  static readonly type = 'ellipse';
  static readonly requiredParams = 4;
  static readonly optionalParams = 1;

  private _cx: number;
  private _cy: number;
  private _rx: number;
  private _ry: number;

  constructor(
    id: string,
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    fill?: string,
  ) {
    super(id);
    this._cx = cx;
    this._cy = cy;
    this._rx = rx;
    this._ry = ry;
    if (fill !== undefined) {
      this.setAttribute('fill', fill);
    }
  }

  readonly tag = 'ellipse';

  static fromArgs(id: string, args: readonly string[]): Ellipse {
    const fill = args.length > 4 ? args[4] : undefined;
    return new Ellipse(
      id,
      NumberFormat.parse(args[0], 'cx'),
      NumberFormat.parse(args[1], 'cy'),
      NumberFormat.parse(args[2], 'rx'),
      NumberFormat.parse(args[3], 'ry'),
      fill,
    );
  }

  static fromAttributes(id: string, attrs: AttributeMap, _text: string | null): Ellipse {
    const ellipse = new Ellipse(
      id,
      this.numericAttribute(attrs, 'cx'),
      this.numericAttribute(attrs, 'cy'),
      this.numericAttribute(attrs, 'rx'),
      this.numericAttribute(attrs, 'ry'),
    );
    ellipse.loadCommonAttributes(attrs, GEOMETRY_ATTRIBUTES);
    return ellipse;
  }

  get cx(): number {
    return this._cx;
  }

  get cy(): number {
    return this._cy;
  }

  get rx(): number {
    return this._rx;
  }

  get ry(): number {
    return this._ry;
  }

  override accept<T>(visitor: ShapeVisitor<T>): T {
    return visitor.visitEllipse(this);
  }

  override moveBy(dx: number, dy: number): void {
    this._cx += dx;
    this._cy += dy;
  }

  override scaleBy(factor: number): void {
    this._cx *= factor;
    this._cy *= factor;
    this._rx *= factor;
    this._ry *= factor;
  }

  override transformBy(matrix: Matrix): void {
    const { a, b, c, d, e, f } = matrix;
    const cx = a * this._cx + c * this._cy + e;
    const cy = b * this._cx + d * this._cy + f;
    this._cx = cx;
    this._cy = cy;
    this._rx *= Math.abs(a);
    this._ry *= Math.abs(d);
  }

  override readGeometry(): GeometryRecord {
    return { cx: this._cx, cy: this._cy, rx: this._rx, ry: this._ry };
  }

  override writeGeometry(geometry: GeometryRecord): void {
    this._cx = this.geometryNumber(geometry, 'cx');
    this._cy = this.geometryNumber(geometry, 'cy');
    this._rx = this.geometryNumber(geometry, 'rx');
    this._ry = this.geometryNumber(geometry, 'ry');
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
    if (name === 'rx') return NumberFormat.format(this._rx);
    if (name === 'ry') return NumberFormat.format(this._ry);
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
    if (name === 'rx') {
      this._rx = NumberFormat.parse(value, 'rx');
      return;
    }
    if (name === 'ry') {
      this._ry = NumberFormat.parse(value, 'ry');
      return;
    }
    super.setAttribute(name, value);
  }
}
