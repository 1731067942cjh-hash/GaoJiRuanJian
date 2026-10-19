import { Document } from '../../domain/Document';
import { DomainError } from '../../domain/errors/DomainError';
import { formatNumber, parseNumber } from '../../domain/NumberFormat';
import { XmlParseError } from '../../serialization/XmlTree';
import type { SvgReadResult } from '../../serialization/SvgReader';
import type { CommandMap } from './CommandDefinition';
import { requireArgumentCount, requireDocument } from './helpers';

export function registerDocumentCommands(commands: CommandMap): void {
  commands.set('init', {
    requiresDocument: false,
    run: (session, args) => {
      requireArgumentCount(args, 0, 2, 'init [w] [h]');
      if (args.length === 1) {
        throw new DomainError('usage: init [w] [h]');
      }
      const width = args.length === 2 ? parseNumber(args[0], 'width') : 800;
      const height = args.length === 2 ? parseNumber(args[1], 'height') : 600;
      const document = new Document(width, height);
      session.document = document;
      session.currentPath = null;
      session.history.lock();
      return [`canvas ${formatNumber(width)}x${formatNumber(height)} created`];
    },
  });

  commands.set('read', {
    requiresDocument: false,
    run: async (session, args) => {
      requireArgumentCount(args, 1, 1, 'read <file.svg>');
      const path = args[0];
      let source: string;
      try {
        source = await session.gateway.readText(path);
      } catch {
        throw new DomainError(`cannot read file: ${path}`);
      }
      let result: SvgReadResult;
      try {
        result = session.reader.read(source);
      } catch (error) {
        if (error instanceof XmlParseError) {
          throw new DomainError(`cannot parse file: ${path}`);
        }
        throw error;
      }
      session.document = result.document;
      session.currentPath = path;
      session.history.lock();
      return [
        ...result.warnings.map((warning) => `warning: ${warning}`),
        `read ${path} (${result.document.elementCount} elements)`,
      ];
    },
  });

  commands.set('save', {
    requiresDocument: true,
    run: async (session, args) => {
      requireArgumentCount(args, 0, 1, 'save [file.svg]');
      const document = requireDocument(session);
      const path = args[0] ?? session.currentPath;
      if (path === null || path.length === 0) {
        throw new DomainError("no file path. use 'save <file.svg>'");
      }
      const svg = session.writer.write(document);
      try {
        await session.gateway.writeText(path, svg);
      } catch {
        throw new DomainError(`cannot write file: ${path}`);
      }
      session.currentPath = path;
      session.history.lock();
      return [`saved to ${path} (${document.elementCount} elements)`];
    },
  });

  commands.set('canvas', {
    requiresDocument: true,
    run: (session, args) => {
      const document = requireDocument(session);
      if (args.length === 0) {
        return [`canvas ${formatNumber(document.width)}x${formatNumber(document.height)}`];
      }
      requireArgumentCount(args, 2, 2, 'canvas [w] [h]');
      const width = parseNumber(args[0], 'width');
      const height = parseNumber(args[1], 'height');
      document.resize(width, height);
      session.history.lock();
      return [`canvas resized to ${formatNumber(width)}x${formatNumber(height)}`];
    },
  });
}
