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

const GEOMETRY_ATTRIBUTES = new Set(['x', 'y', 'width', 'height']);

export class Rect extends Shape {
  static readonly type = 'rect';
  static readonly requiredParams = 4;
  static readonly optionalParams = 1;

  private _x: number;
  private _y: number;
  private _width: number;
  private _height: number;

  constructor(id: string, x: number, y: number, width: number, height: number, fill?: string) {
    super(id);
    this._x = x;
    this._y = y;
    this._width = width;
    this._height = height;
    if (fill !== undefined) {
      this.setAttribute('fill', fill);
    }
  }

  readonly tag = 'rect';

  static fromArgs(id: string, args: readonly string[]): Rect {
    const fill = args.length > 4 ? args[4] : undefined;
    return new Rect(
      id,
      parseNumber(args[0], 'x'),
      parseNumber(args[1], 'y'),
      parseNumber(args[2], 'width'),
      parseNumber(args[3], 'height'),
      fill,
    );
  }

  static fromAttributes(id: string, attrs: AttributeMap, _text: string | null): Rect {
    const rect = new Rect(
      id,
      numericAttribute(attrs, 'x'),
      numericAttribute(attrs, 'y'),
      numericAttribute(attrs, 'width'),
      numericAttribute(attrs, 'height'),
    );
    rect.loadCommonAttributes(attrs, GEOMETRY_ATTRIBUTES);
    return rect;
  }

  get x(): number {
    return this._x;
  }

  get y(): number {
    return this._y;
  }

  get width(): number {
    return this._width;
  }

  get height(): number {
    return this._height;
  }

  override accept<T>(visitor: ShapeVisitor<T>): T {
    return visitor.visitRect(this);
  }

  override moveBy(dx: number, dy: number): void {
    this._x += dx;
    this._y += dy;
  }

  override scaleBy(factor: number): void {
    this._x *= factor;
    this._y *= factor;
    this._width *= factor;
    this._height *= factor;
  }

  override transformBy(matrix: Matrix): void {
    const { a, b, c, d, e, f } = matrix;
    const x = a * this._x + c * this._y + e;
    const y = b * this._x + d * this._y + f;
    this._x = x;
    this._y = y;
    this._width *= Math.abs(a);
    this._height *= Math.abs(d);
  }

  override readGeometry(): GeometryRecord {
    return { x: this._x, y: this._y, width: this._width, height: this._height };
  }

  override writeGeometry(geometry: GeometryRecord): void {
    this._x = geometryNumber(geometry, 'x');
    this._y = geometryNumber(geometry, 'y');
    this._width = geometryNumber(geometry, 'width');
    this._height = geometryNumber(geometry, 'height');
  }

  override anchor(): { x: number; y: number } {
    return { x: this._x, y: this._y };
  }

  override supportsAttribute(name: string): boolean {
    return GEOMETRY_ATTRIBUTES.has(name) || super.supportsAttribute(name);
  }

  override getAttribute(name: string): string | undefined {
    const common = super.getAttribute(name);
    if (common !== undefined) return common;
    if (name === 'x') return formatNumber(this._x);
    if (name === 'y') return formatNumber(this._y);
    if (name === 'width') return formatNumber(this._width);
    if (name === 'height') return formatNumber(this._height);
    return undefined;
  }

  override setAttribute(name: string, value: string): void {
    if (name === 'x') {
      this._x = parseNumber(value, 'x');
      return;
    }
    if (name === 'y') {
      this._y = parseNumber(value, 'y');
      return;
    }
    if (name === 'width') {
      this._width = parseNumber(value, 'width');
      return;
    }
    if (name === 'height') {
      this._height = parseNumber(value, 'height');
      return;
    }
    super.setAttribute(name, value);
  }
}
