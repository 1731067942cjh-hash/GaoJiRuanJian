import type { Document } from '../domain/Document';
import { History } from '../command/History';
import type { FileGateway } from '../io/FileGateway';
import type { ShapeFactory } from '../shape/ShapeFactory';
import type { SvgReader } from '../serialization/SvgReader';
import type { SvgWriter } from '../serialization/SvgWriter';

/** Mutable state owned by one REPL session. */
export class EditorSession {
  document: Document | null = null;
  /** Path used by the last successful read; preferred by bare `save`. */
  readPath: string | null = null;
  /** Last successful read or save path; fallback for bare `save`. */
  lastPath: string | null = null;
  readonly history = new History();

  constructor(
    readonly gateway: FileGateway,
    readonly factory: ShapeFactory,
    readonly reader: SvgReader,
    readonly writer: SvgWriter,
  ) {}
}
