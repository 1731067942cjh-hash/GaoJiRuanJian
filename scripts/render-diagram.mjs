#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const source = join(root, 'doc', 'architecture.puml');

if (!existsSync(source)) {
  console.error('missing doc/architecture.puml');
  process.exit(1);
}

try {
  execFileSync('plantuml', ['-tsvg', source], { stdio: 'inherit' });
  console.log('rendered doc/architecture.svg');
} catch (error) {
  console.error('failed to run plantuml; install it with: brew install plantuml');
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
