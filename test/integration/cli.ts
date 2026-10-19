import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('../..', import.meta.url));
const tsxCli = join(projectRoot, 'node_modules/tsx/dist/cli.mjs');
const mainFile = join(projectRoot, 'src/cli/main.ts');
const otherSvg = join(projectRoot, 'test/fixtures/other.svg');

export interface CliRun {
  readonly stdout: string;
  readonly stderr: string;
  readonly status: number | null;
  readonly directory: string;
  read(name: string): string;
  cleanup(): void;
}

/** Run the real CLI in a fresh temporary directory with `other.svg` available. */
export function runCli(input: string): CliRun {
  const directory = mkdtempSync(join(tmpdir(), 'svg-editor-cli-'));
  copyFileSync(otherSvg, join(directory, 'other.svg'));
  const result = spawnSync(process.execPath, [tsxCli, mainFile], {
    cwd: directory,
    input: input.endsWith('\n') ? input : `${input}\n`,
    encoding: 'utf8',
    timeout: 30_000,
  });
  return {
    stdout: (result.stdout ?? '').replace(/\r\n/g, '\n'),
    stderr: (result.stderr ?? '').replace(/\r\n/g, '\n'),
    status: result.status,
    directory,
    read(name: string): string {
      return readFileSync(join(directory, name), 'utf8');
    },
    cleanup(): void {
      rmSync(directory, { recursive: true, force: true });
    },
  };
}
