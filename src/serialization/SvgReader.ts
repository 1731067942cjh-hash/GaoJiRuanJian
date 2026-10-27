import { Document } from '../domain/Document';
import { DomainError } from '../domain/errors/DomainError';
import { Container } from '../domain/Container';
import { IdAllocator } from '../domain/IdAllocator';
import { IDENTITY, Transform, type Matrix } from '../domain/Transform';
import type { Shape } from '../domain/Shape';
import { NumberFormat } from '../domain/NumberFormat';
import type { ShapeFactory } from '../shape/ShapeFactory';
import type { XmlElement, XmlTreeParser } from './XmlTree';

export interface SvgReadResult {
  readonly document: Document;
  readonly warnings: readonly string[];
}

/**
 * Turns SVG text into the domain model. Missing ids are assigned with a
 * warning; transforms are baked into coordinates; unsupported elements are
 * skipped instead of being silently dropped.
 */
export class SvgReader {
  constructor(
    private readonly parser: XmlTreeParser,
    private readonly factory: ShapeFactory,
  ) {}

  read(source: string): SvgReadResult {
    const root = this.parser.parse(source);
    if (root.tagName !== 'svg') {
      throw new DomainError('invalid svg: missing <svg> root');
    }

    const explicitIds = new Set<string>();
    const rootId = root.attributes.get('id');
    if (rootId !== undefined) {
      explicitIds.add(rootId);
    }
    this.collectIds(root, explicitIds);
    const allocator = new IdAllocator(explicitIds);
    const size = this.readCanvasSize(root);
    const document = new Document(size.width, size.height, size.viewBox);
    document.loadRootAttributes(root.attributes);
    const warnings: string[] = [];

    for (const child of root.children) {
      const shape = this.build(child, IDENTITY, allocator, warnings);
      if (shape !== null) {
        document.appendChild(shape);
      }
    }

    return { document, warnings };
  }

  private collectIds(element: XmlElement, ids: Set<string>): void {
    for (const child of element.children) {
      const id = child.attributes.get('id');
      if (id !== undefined) {
        if (ids.has(id)) {
          throw new DomainError(`duplicate id: ${id}`);
        }
        ids.add(id);
      }
      this.collectIds(child, ids);
    }
  }

  private build(
    element: XmlElement,
    parentMatrix: Matrix,
    allocator: IdAllocator,
    warnings: string[],
  ): Shape | null {
    const tag = element.tagName;
    if (!this.factory.has(tag)) {
      warnings.push(`unsupported element <${tag}> skipped`);
      return null;
    }

    const explicitId = element.attributes.get('id');
    const id = explicitId ?? allocator.assign(tag);
    if (explicitId === undefined) {
      warnings.push(`assigned id ${id} to unnamed <${tag}>`);
    }

    let matrix = parentMatrix;
    const transformText = element.attributes.get('transform');
    if (transformText !== undefined) {
      const parsed = Transform.parse(transformText);
      for (const unsupported of parsed.unsupported) {
        warnings.push(`unsupported transform: ${unsupported}`);
      }
      matrix = Transform.multiply(parentMatrix, parsed.matrix);
    }

    const shape = this.factory.createFromAttributes(
      tag,
      id,
      element.attributes,
      element.text,
    );

    if (shape instanceof Container) {
      for (const child of element.children) {
        const built = this.build(child, matrix, allocator, warnings);
        if (built !== null) {
          shape.appendChild(built);
        }
      }
    } else {
      shape.transformBy(matrix);
      if (Object.values(shape.readGeometry()).some(value => !Number.isFinite(value))) {
        throw new DomainError('geometry must remain finite');
      }
      if (element.children.length > 0) {
        warnings.push(`nested elements in <${tag}> are not supported`);
      }
    }

    return shape;
  }

  private readCanvasSize(root: XmlElement): {
    width: number; height: number; viewBox?: readonly [number, number, number, number];
  } {
    const viewBox = this.parseViewBox(root.attributes.get('viewBox'));
    const width = this.parseLength(root.attributes.get('width'), 'width') ?? viewBox?.[2] ?? 800;
    const height = this.parseLength(root.attributes.get('height'), 'height') ?? viewBox?.[3] ?? 600;
    return { width, height, viewBox };
  }

  private parseViewBox(value: string | undefined): readonly [number, number, number, number] | undefined {
    if (value === undefined) return undefined;
    const parts = value.trim().split(/[\s,]+/);
    const numbers = parts.map(part => NumberFormat.parse(part, 'viewBox'));
    if (numbers.length !== 4 || numbers[2] <= 0 || numbers[3] <= 0) {
      throw new DomainError(`invalid viewBox: ${value}`);
    }
    return [numbers[0], numbers[1], numbers[2], numbers[3]];
  }

  private parseLength(value: string | undefined, name: string): number | undefined {
    if (value === undefined) return undefined;
    const match = /^\s*([+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)(?:px)?\s*$/.exec(value);
    if (match === null) throw new DomainError(`invalid ${name}: ${value}`);
    const parsed = NumberFormat.parse(match[1], name);
    if (parsed <= 0) throw new DomainError(`invalid ${name}: ${value}`);
    return parsed;
  }
}
