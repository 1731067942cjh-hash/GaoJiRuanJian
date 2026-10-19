import { Container } from './Container';
import type { Shape } from './Shape';
import type { ShapeVisitor } from './ShapeVisitor';
import { DomainError } from './errors/DomainError';

/** The root `<svg>` element: a container plus the canvas dimensions. */
export class Document extends Container {
  readonly tag = 'svg';

  private _width: number;
  private _height: number;

  constructor(width: number, height: number) {
    super('svg');
    assertCanvasSize(width, height);
    this._width = width;
    this._height = height;
  }

  get width(): number {
    return this._width;
  }

  get height(): number {
    return this._height;
  }

  resize(width: number, height: number): void {
    assertCanvasSize(width, height);
    this._width = width;
    this._height = height;
  }

  /** Find a shape by id; the root itself is not addressable. */
  find(id: string): Shape | undefined {
    return this.findInChildren(id);
  }

  allShapes(): Shape[] {
    return this.descendants();
  }

  get elementCount(): number {
    return this.descendants().length;
  }

  override accept<T>(visitor: ShapeVisitor<T>): T {
    return visitor.visitDocument(this);
  }
}

function assertCanvasSize(width: number, height: number): void {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new DomainError('canvas size must be positive');
  }
}
