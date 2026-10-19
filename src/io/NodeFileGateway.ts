import { readFile, writeFile } from 'node:fs/promises';
import type { FileGateway } from './FileGateway';

export class NodeFileGateway implements FileGateway {
  readText(path: string): Promise<string> {
    return readFile(path, 'utf8');
  }

  writeText(path: string, contents: string): Promise<void> {
    return writeFile(path, contents, 'utf8');
  }
}
