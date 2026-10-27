import { access, constants, lstat, open, readFile, realpath, rename, stat, unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { basename, dirname, join, resolve } from 'node:path';
import type { FileGateway } from './FileGateway';

export class NodeFileGateway implements FileGateway {
  readText(path: string): Promise<string> {
    return readFile(path, 'utf8');
  }

  /** Write a complete sibling file before atomically replacing the destination. */
  async writeText(path: string, contents: string): Promise<void> {
    let target = resolve(path);
    let existing;
    try {
      existing = await lstat(target);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }

    let mode = 0o666;
    if (existing !== undefined) {
      if (existing.isSymbolicLink()) target = await realpath(target);
      const metadata = await stat(target);
      if (!metadata.isFile()) throw new Error('destination is not a regular file');
      await access(target, constants.W_OK);
      mode = metadata.mode & 0o777;
    }

    const temporary = join(dirname(target), `.${basename(target)}.${randomUUID()}.tmp`);
    let created = false;
    try {
      const handle = await open(temporary, 'wx', mode);
      created = true;
      try {
        if (existing !== undefined) await handle.chmod(mode);
        await handle.writeFile(contents, 'utf8');
        await handle.sync();
      } finally {
        await handle.close();
      }
      await rename(temporary, target);
      created = false;
    } finally {
      if (created) await unlink(temporary).catch(() => undefined);
    }
  }
}
