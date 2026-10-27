#!/usr/bin/env node
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const args = process.argv.slice(2);
const check = args.length === 1 && args[0] === '--check';
const exporting = args.length === 2 && args[0] === '--output';
if (args.length !== 0 && !check && !exporting) {
  console.error('usage: npm run submission -- [--output <directory>]');
  process.exit(1);
}

const source = await readFile(join(root, 'doc', 'README.md'), 'utf8');
const diagram = await readFile(join(root, 'doc', 'architecture.puml'), 'utf8');
if (!source.includes(`\`\`\`plantuml\n${diagram.trimEnd()}\n\`\`\``)) {
  console.error('doc/README.md must include the current architecture.puml source');
  process.exit(1);
}
const portable = source.replace(
  '](architecture.svg)',
  '](https://raw.githubusercontent.com/1731067942cjh-hash/GaoJiRuanJian/final/doc/architecture.svg)',
);
const target = join(root, 'README.md');
if (check) {
  const current = await readFile(target, 'utf8').catch(() => '');
  if (current !== portable) {
    console.error('README.md is out of date; run npm run submission');
    process.exit(1);
  }
  console.log('README.md matches the complete report and architecture source');
} else {
  await writeFile(target, portable, 'utf8');
  console.log('updated the complete, standalone README.md');
  if (exporting) {
    const outputDirectory = resolve(args[1]);
    await mkdir(outputDirectory, { recursive: true });
    await writeFile(join(outputDirectory, 'README.md'), portable, 'utf8');
    console.log(`exported ${join(outputDirectory, 'README.md')}`);
  }
}
