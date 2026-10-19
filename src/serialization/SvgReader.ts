import { Document } from '../domain/Document';
import { DomainError } from '../domain/errors/DomainError';
import { Container } from '../domain/Container';
import { IdAllocator } from '../domain/IdAllocator';
import { IDENTITY, Transform, type Matrix } from '../domain/Transform';
import type { Shape } from '../domain/Shape';
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
    const size = readCanvasSize(root);
    const document = new Document(size.width, size.height);
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
      if (!this.factory.has(child.tagName)) {
        continue;
      }
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
      tag === 'text' ? element.text.trim() : null,
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
      if (element.children.length > 0) {
        warnings.push(`nested elements in <${tag}> are not supported`);
      }
    }

    return shape;
  }
}

function readCanvasSize(root: XmlElement): { width: number; height: number } {
  const viewBox = parseViewBox(root.attributes.get('viewBox'));
  const width = parseLength(root.attributes.get('width')) ?? viewBox?.width ?? 800;
  const height = parseLength(root.attributes.get('height')) ?? viewBox?.height ?? 600;
  return { width, height };
}

function parseViewBox(value: string | undefined): { width: number; height: number } | null {
  if (value === undefined) return null;
  const parts = value.split(/[\s,]+/).filter((part) => part.length > 0);
  if (parts.length !== 4) return null;
  const width = Number(parts[2]);
  const height = Number(parts[3]);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null;
  }
  return { width, height };
}

function parseLength(value: string | undefined): number | null {
  if (value === undefined) return null;
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}
