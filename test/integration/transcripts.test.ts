import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { runCli } from './cli';

const transcripts = fileURLToPath(new URL('../fixtures/transcripts', import.meta.url));

function load(name: string): { input: string; expected: string } {
  return {
    input: readFileSync(join(transcripts, `${name}.in`), 'utf8'),
    expected: readFileSync(join(transcripts, `${name}.out`), 'utf8'),
  };
}

describe('golden transcripts', () => {
  for (const name of ['section6', 'section6_1', 'errors', 'history']) {
    it(`replays ${name}`, () => {
      const { input, expected } = load(name);
      const run = runCli(input);
      try {
        expect(run.status).toBe(0);
        expect(run.stderr).toBe('');
        expect(run.stdout).toBe(expected);
      } finally {
        run.cleanup();
      }
    });
  }
});

function treeBlocks(output: string): string[] {
  const blocks: string[] = [];
  let current: string[] | null = null;
  for (const line of output.split('\n')) {
    if (line.startsWith('svg (')) {
      if (current !== null) blocks.push(current.join('\n'));
      current = [line];
    } else if (current !== null && /^[│├└ ]/.test(line) && line.trim().length > 0) {
      current.push(line);
    } else if (current !== null) {
      blocks.push(current.join('\n'));
      current = null;
    }
  }
  if (current !== null) blocks.push(current.join('\n'));
  return blocks;
}

describe('CLI behaviour', () => {
  it('helps without a document', () => {
    const run = runCli('help');
    try {
      expect(run.status).toBe(0);
      expect(run.stdout).toContain('svg-editor 0.1 — commands');
      expect(run.stdout).toContain('create rect <id>');
      expect(run.stdout).not.toContain('error:');
    } finally {
      run.cleanup();
    }
  });

  it('ignores comments and blank lines', () => {
    const run = runCli('# a comment\n\ninit 100 100\n# another\ncanvas');
    try {
      expect(run.stdout).toBe('canvas 100x100 created\ncanvas 100x100\n');
    } finally {
      run.cleanup();
    }
  });

  it('keeps quoted text, including the word "in"', () => {
    const run = runCli(
      [
        'init 100 100',
        'create g g1',
        'create text t 0 0 "in" in g1',
        'show t',
        'set t text "new text"',
        'show t',
      ].join('\n'),
    );
    try {
      expect(run.stdout).toContain('text#t created in g#g1');
      expect(run.stdout).toContain('text="in"');
      expect(run.stdout).toContain('text="new text"');
      expect(run.stdout).not.toContain('error:');
    } finally {
      run.cleanup();
    }
  });

  it('supports paths with spaces and save without a path', () => {
    const run = runCli(
      [
        'read other.svg',
        'save "my file.svg"',
        'read "my file.svg"',
        'save',
        'canvas',
      ].join('\n'),
    );
    try {
      expect(run.stdout).toContain('saved to my file.svg (7 elements)');
      expect(run.stdout).toContain('read my file.svg (7 elements)');
      expect(run.stdout).toContain('saved to my file.svg (7 elements)');
      expect(run.stdout).toContain('canvas 400x300');
      expect(run.read('my file.svg')).toContain('<svg');
    } finally {
      run.cleanup();
    }
  });

  it('round-trips a saved document', () => {
    const run = runCli(
      ['read other.svg', 'tree', 'save out.svg', 'read out.svg', 'tree'].join('\n'),
    );
    try {
      const blocks = treeBlocks(run.stdout);
      expect(blocks).toHaveLength(2);
      expect(blocks[0]).toBe(blocks[1]);
      expect(run.stdout).toContain('saved to out.svg (7 elements)');
      const afterSecondRead = run.stdout.split('read out.svg')[1] ?? '';
      expect(afterSecondRead).not.toContain('warning:');
      expect(run.read('out.svg').startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(
        true,
      );
    } finally {
      run.cleanup();
    }
  });

  it('rejects scale of a non-positive factor and unknown attributes', () => {
    const run = runCli(
      ['init 10 10', 'create rect r 0 0 1 1', 'scale r -1', 'set r opacity 1'].join('\n'),
    );
    try {
      expect(run.stdout).toContain('error: scale factor must be positive');
      expect(run.stdout).toContain('error: unknown attribute: opacity');
    } finally {
      run.cleanup();
    }
  });
});

describe('document edge cases', () => {
  it('uses the default canvas size', () => {
    const run = runCli('init\ncanvas');
    try {
      expect(run.stdout).toBe('canvas 800x600 created\ncanvas 800x600\n');
    } finally {
      run.cleanup();
    }
  });

  it('requires a path when the document was never read or saved', () => {
    const run = runCli(['init 100 100', 'create rect r 0 0 1 1', 'save', 'undo'].join('\n'));
    try {
      expect(run.stdout).toContain("error: no file path. use 'save <file.svg>'");
      // A failed save does not lock history: the create is still undoable.
      expect(run.stdout).toContain('rect#r deleted');
    } finally {
      run.cleanup();
    }
  });

  it('locks history after resizing the canvas', () => {
    const run = runCli(
      ['init 100 100', 'create rect r 0 0 1 1', 'canvas 200 120', 'undo', 'canvas'].join('\n'),
    );
    try {
      expect(run.stdout).toContain('canvas resized to 200x120');
      expect(run.stdout).toContain('error: undo not allowed after io command');
      expect(run.stdout.endsWith('canvas 200x120\n')).toBe(true);
    } finally {
      run.cleanup();
    }
  });

  it('reports unknown commands', () => {
    const run = runCli('nonsense');
    try {
      expect(run.stdout).toBe('error: unknown command: nonsense\n');
    } finally {
      run.cleanup();
    }
  });
});

describe('save path rules', () => {
  it('prefers the read path for a bare save', () => {
    const run = runCli(
      ['read other.svg', 'save copy.svg', 'save'].join('\n'),
    );
    try {
      const saves = run.stdout
        .split('\n')
        .filter((line) => line.startsWith('saved to '));
      expect(saves).toEqual([
        'saved to copy.svg (7 elements)',
        'saved to other.svg (7 elements)',
      ]);
    } finally {
      run.cleanup();
    }
  });

  it('falls back to the last save path when the document came from init', () => {
    const run = runCli(['init 20 20', 'create rect r 0 0 1 1', 'save a.svg', 'save'].join('\n'));
    try {
      const saves = run.stdout
        .split('\n')
        .filter((line) => line.startsWith('saved to '));
      expect(saves).toEqual(['saved to a.svg (1 elements)', 'saved to a.svg (1 elements)']);
    } finally {
      run.cleanup();
    }
  });
});
