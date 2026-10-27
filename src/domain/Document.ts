import { Container } from './Container';
import type { Shape, AttributeMap } from './Shape';
import type { ShapeVisitor } from './ShapeVisitor';
import { DomainError } from './errors/DomainError';

/** The root `<svg>` element: a container plus the canvas dimensions. */
export class Document extends Container {
  readonly tag = 'svg';

  private _width: number;
  private _height: number;
  private _viewBox: readonly [number, number, number, number];
  private _svgId: string | undefined;

  constructor(width: number, height: number, viewBox?: readonly [number, number, number, number]) {
    super('svg');
    Document.assertCanvasSize(width, height);
    if (viewBox !== undefined && (
      viewBox.some(value => !Number.isFinite(value)) || viewBox[2] <= 0 || viewBox[3] <= 0
    )) {
      throw new DomainError('invalid viewBox');
    }
    this._width = width;
    this._height = height;
    this._viewBox = Object.freeze(viewBox === undefined ? [0, 0, width, height] : [...viewBox]);
  }

  get width(): number {
    return this._width;
  }

  get height(): number {
    return this._height;
  }

  get viewBox(): readonly [number, number, number, number] { return this._viewBox; }
  get svgId(): string | undefined { return this._svgId; }

  /** Root metadata participates in SVG round-trips but is not CLI-addressable. */
  loadRootAttributes(attrs: AttributeMap): void {
    this._svgId = attrs.get('id');
    this.loadCommonAttributes(attrs, new Set(['width', 'height', 'viewBox', 'xmlns']));
  }

  hasId(id: string): boolean {
    return id === this._svgId || this.find(id) !== undefined;
  }

  resize(width: number, height: number): void {
    Document.assertCanvasSize(width, height);
    this._width = width;
    this._height = height;
    this._viewBox = Object.freeze([0, 0, width, height]);
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

  private static assertCanvasSize(width: number, height: number): void {
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
      throw new DomainError('canvas size must be positive');
    }
  }
}
