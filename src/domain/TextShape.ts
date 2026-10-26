import { NumberFormat } from './NumberFormat';
import {
  Shape,
  type AttributeMap,
  type GeometryRecord,
} from './Shape';
import type { ShapeVisitor } from './ShapeVisitor';
import type { Matrix } from './Transform';

const GEOMETRY_ATTRIBUTES = new Set(['x', 'y']);

export class TextShape extends Shape {
  static readonly type = 'text';
  static readonly requiredParams = 3;
  static readonly optionalParams = 0;

  private _x: number;
  private _y: number;
  private _content: string;

  constructor(id: string, x: number, y: number, content: string) {
    super(id);
    this._x = x;
    this._y = y;
    this._content = content;
  }

  readonly tag = 'text';

  static fromArgs(id: string, args: readonly string[]): TextShape {
    return new TextShape(
      id,
      NumberFormat.parse(args[0], 'x'),
      NumberFormat.parse(args[1], 'y'),
      args[2] ?? '',
    );
  }

  static fromAttributes(id: string, attrs: AttributeMap, text: string | null): TextShape {
    const shape = new TextShape(id, this.numericAttribute(attrs, 'x'), this.numericAttribute(attrs, 'y'), text ?? '');
    shape.loadCommonAttributes(attrs, GEOMETRY_ATTRIBUTES);
    return shape;
  }

  get x(): number {
    return this._x;
  }

  get y(): number {
    return this._y;
  }

  get content(): string {
    return this._content;
  }

  override accept<T>(visitor: ShapeVisitor<T>): T {
    return visitor.visitText(this);
  }

  override moveBy(dx: number, dy: number): void {
    this._x += dx;
    this._y += dy;
  }

  override scaleBy(factor: number): void {
    this._x *= factor;
    this._y *= factor;
  }

  override transformBy(matrix: Matrix): void {
    const { a, b, c, d, e, f } = matrix;
    const x = a * this._x + c * this._y + e;
    const y = b * this._x + d * this._y + f;
    this._x = x;
    this._y = y;
    const scale = Math.sqrt(Math.abs(a * d - b * c));
    const fontSize = this.getExtra('font-size');
    if (fontSize !== undefined) {
      const numeric = Number(fontSize);
      if (Number.isFinite(numeric)) {
        this.setExtra('font-size', NumberFormat.format(numeric * scale));
      }
    }
  }

  override readGeometry(): GeometryRecord {
    return { x: this._x, y: this._y };
  }

  override writeGeometry(geometry: GeometryRecord): void {
    this._x = this.geometryNumber(geometry, 'x');
    this._y = this.geometryNumber(geometry, 'y');
  }

  override anchor(): { x: number; y: number } {
    return { x: this._x, y: this._y };
  }

  override supportsAttribute(name: string): boolean {
    return name === 'text' || GEOMETRY_ATTRIBUTES.has(name) || super.supportsAttribute(name);
  }

  override getAttribute(name: string): string | undefined {
    const common = super.getAttribute(name);
    if (common !== undefined) return common;
    if (name === 'text') return this._content;
    if (name === 'x') return NumberFormat.format(this._x);
    if (name === 'y') return NumberFormat.format(this._y);
    return undefined;
  }

  override setAttribute(name: string, value: string): void {
    if (name === 'text') {
      this._content = value;
      return;
    }
    if (name === 'x') {
      this._x = NumberFormat.parse(value, 'x');
      return;
    }
    if (name === 'y') {
      this._y = NumberFormat.parse(value, 'y');
      return;
    }
    super.setAttribute(name, value);
  }
}
