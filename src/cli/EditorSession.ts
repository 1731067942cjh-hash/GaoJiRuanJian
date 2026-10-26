import { Document } from '../domain/Document';
import { DomainError } from '../domain/errors/DomainError';
import { Group } from '../domain/Group';
import type { Shape } from '../domain/Shape';
import { History } from '../command/History';
import type { EditCommand } from '../command/EditCommand';
import type { FileGateway } from '../io/FileGateway';
import type { ShapeFactory } from '../shape/ShapeFactory';
import type { SvgReader, SvgReadResult } from '../serialization/SvgReader';
import type { SvgWriter } from '../serialization/SvgWriter';
import { XmlParseError } from '../serialization/XmlParseError';

/** Owns document lifecycle, paths and history; changes commit only on success. */
export class EditorSession {
  private _document: Document | null = null;
  private readPath: string | null = null;
  private lastPath: string | null = null;
  private readonly history = new History();

  constructor(
    private readonly gateway: FileGateway,
    readonly factory: ShapeFactory,
    private readonly reader: SvgReader,
    private readonly writer: SvgWriter,
  ) {}

  get document(): Document | null { return this._document; }

  requireDocument(): Document {
    if (this._document === null) {
      throw new DomainError("no document. use 'init' or 'read' first");
    }
    return this._document;
  }

  resolveShape(id: string): Shape {
    const shape = this.requireDocument().find(id);
    if (shape === undefined) throw new DomainError(`no such shape: ${id}`);
    return shape;
  }

  resolveGroup(id: string): Group {
    const shape = this.requireDocument().find(id);
    if (shape === undefined) throw new DomainError(`no such container: ${id}`);
    if (!(shape instanceof Group)) throw new DomainError(`not a container: ${id}`);
    return shape;
  }

  init(width: number, height: number): void {
    const document = new Document(width, height);
    this._document = document;
    this.readPath = null;
    this.lastPath = null;
    this.history.lock();
  }

  async read(path: string): Promise<SvgReadResult> {
    let source: string;
    try { source = await this.gateway.readText(path); }
    catch { throw new DomainError(`cannot read file: ${path}`); }
    let result: SvgReadResult;
    try { result = this.reader.read(source); }
    catch (error) {
      if (error instanceof XmlParseError) throw new DomainError(`cannot parse file: ${path}`);
      throw error;
    }
    this._document = result.document;
    this.readPath = path;
    this.lastPath = path;
    this.history.lock();
    return result;
  }

  async save(requestedPath?: string): Promise<string> {
    const document = this.requireDocument();
    const path = requestedPath ?? this.readPath ?? this.lastPath;
    if (path === null || path.length === 0) {
      throw new DomainError("no file path. use 'save <file.svg>'");
    }
    const svg = this.writer.write(document);
    try { await this.gateway.writeText(path, svg); }
    catch { throw new DomainError(`cannot write file: ${path}`); }
    this.lastPath = path;
    this.history.lock();
    return path;
  }

  resize(width: number, height: number): void {
    this.requireDocument().resize(width, height);
    this.history.lock();
  }

  execute(command: EditCommand): string {
    return this.history.run(command, this.requireDocument());
  }

  undo(): string { return this.history.undo(this.requireDocument()); }
  redo(): string { return this.history.redo(this.requireDocument()); }
}
