import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import ts from 'typescript';

const projectRoot = fileURLToPath(new URL('../..', import.meta.url));
const sourceRoot = join(projectRoot, 'src');

const ALLOWED: Record<string, ReadonlySet<string>> = {
  domain: new Set(['domain']),
  shape: new Set(['domain', 'shape']),
  command: new Set(['domain', 'shape', 'command']),
  view: new Set(['domain', 'view']),
  serialization: new Set(['domain', 'shape', 'serialization', 'external']),
  io: new Set(['io', 'node']),
  cli: new Set([
    'domain',
    'shape',
    'command',
    'view',
    'serialization',
    'io',
    'cli',
    'node',
    'external',
  ]),
};

function sourceFiles(directory: string): string[] {
  const result: string[] = [];
  for (const entry of readdirSync(directory)) {
    const full = join(directory, entry);
    if (statSync(full).isDirectory()) {
      result.push(...sourceFiles(full));
    } else if (full.endsWith('.ts')) {
      result.push(full);
    }
  }
  return result;
}

function importedModules(file: string): string[] {
  const source = readFileSync(file, 'utf8');
  const specifiers = [
    ...source.matchAll(/\bfrom\s+['"]([^'"]+)['"]/g),
    ...source.matchAll(/\bimport\s+['"]([^'"]+)['"]/g),
  ].map((match) => match[1]);

  return specifiers.map((specifier) => {
    if (specifier.startsWith('node:')) return 'node';
    if (!specifier.startsWith('.')) return 'external';
    return relative(sourceRoot, resolve(dirname(file), specifier)).split(sep)[0];
  });
}

function moduleOf(file: string): string {
  return relative(sourceRoot, file).split(sep)[0];
}

describe('dependency direction', () => {
  const files = sourceFiles(sourceRoot);

  it('only imports modules allowed by the architecture table', () => {
    const violations: string[] = [];
    for (const file of files) {
      const owner = moduleOf(file);
      const allowed = ALLOWED[owner];
      if (allowed === undefined) {
        violations.push(`${relative(projectRoot, file)}: no rule for module ${owner}`);
        continue;
      }
      for (const target of importedModules(file)) {
        if (!allowed.has(target)) {
          violations.push(
            `${relative(projectRoot, file)}: ${owner} must not depend on ${target}`,
          );
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it('keeps the domain free of node, external and UI dependencies', () => {
    for (const file of files.filter((entry) => moduleOf(entry) === 'domain')) {
      for (const target of importedModules(file)) {
        expect(target).toBe('domain');
      }
    }
  });

  it('uses one class per file and matches the file name', () => {
    const violations: string[] = [];
    for (const file of files) {
      const source = readFileSync(file, 'utf8');
      const classNames = [...source.matchAll(/export\s+(?:abstract\s+)?class\s+(\w+)/g)].map(
        (match) => match[1],
      );
      if (classNames.length === 0) continue;
      const base = relative(sourceRoot, file).replace(/\.ts$/, '').split(sep).pop();
      if (classNames.length !== 1 || classNames[0] !== base) {
        violations.push(
          `${relative(projectRoot, file)}: classes ${classNames.join(', ')} (file ${base})`,
        );
      }
    }
    expect(violations).toEqual([]);
  });

  it('keeps production behaviour in classes and mutable fields encapsulated', () => {
    const violations: string[] = [];
    for (const file of files) {
      const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
      for (const statement of source.statements) {
        if (ts.isFunctionDeclaration(statement)) {
          violations.push(`${relative(projectRoot, file)}: top-level function ${statement.name?.text}`);
        }
        if (!ts.isClassDeclaration(statement)) continue;
        for (const member of statement.members) {
          if (!ts.isPropertyDeclaration(member)) continue;
          const modifiers = ts.getModifiers(member) ?? [];
          if (!modifiers.some(modifier => [
            ts.SyntaxKind.PrivateKeyword, ts.SyntaxKind.ProtectedKeyword, ts.SyntaxKind.ReadonlyKeyword,
          ].includes(modifier.kind))) {
            violations.push(`${relative(projectRoot, file)}: mutable public field ${member.name.getText(source)}`);
          }
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it('isolates third-party XML imports to the adapter', () => {
    for (const file of files.filter(entry => moduleOf(entry) === 'serialization')) {
      if (file.endsWith(`${sep}XmldomTree.ts`)) continue;
      expect(importedModules(file), relative(projectRoot, file)).not.toContain('external');
    }
  });
});
