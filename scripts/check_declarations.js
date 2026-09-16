/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { existsSync, globSync, readFileSync } from 'node:fs';
import { builtinModules } from 'node:module';
import { dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const distDir = resolve(repoRoot, 'dist');
const manifest = JSON.parse(
  readFileSync(resolve(repoRoot, 'package.json'), 'utf-8')
);

const BUILTINS = new Set(builtinModules);

const SPECIFIER_PATTERN =
  /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+|\brequire\s*\(\s*)['"]([^'"\n]+)['"]/g;

const withoutComments = (source) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');

const packageNameOf = (specifier) => {
  const parts = specifier.split('/');
  return specifier.startsWith('@') ? `${parts[0]}/${parts[1]}` : parts[0];
};

if (!existsSync(distDir)) {
  throw new Error('dist/ is missing. Run `pnpm build` before this check.');
}

const declared = new Set([
  manifest.name,
  ...Object.keys(manifest.dependencies ?? {}),
  ...Object.keys(manifest.peerDependencies ?? {}),
  ...Object.keys(manifest.optionalDependencies ?? {}),
]);

const violations = [];

for (const file of globSync('**/*.{js,d.ts}', { cwd: distDir })) {
  const absolute = resolve(distDir, file);
  const contents = withoutComments(readFileSync(absolute, 'utf-8'));

  for (const [, specifier] of contents.matchAll(SPECIFIER_PATTERN)) {
    if (specifier.startsWith('.')) {
      const target = resolve(dirname(absolute), specifier);
      if (target !== distDir && !target.startsWith(`${distDir}${sep}`)) {
        violations.push({
          file,
          specifier,
          reason: `relative import escapes dist/ (resolves to ${relative(repoRoot, target)})`,
        });
      }
      const isCjs = file.startsWith(`cjs${sep}`);
      if (!isCjs && !/\.[a-zA-Z0-9]+$/.test(specifier)) {
        violations.push({
          file,
          specifier,
          reason:
            'relative import is missing a file extension (build:specifiers should have rewritten it)',
        });
      }
      continue;
    }

    if (specifier.startsWith('node:') || BUILTINS.has(specifier)) {
      continue;
    }

    const name = packageNameOf(specifier);
    if (!declared.has(name)) {
      violations.push({
        file,
        specifier,
        reason: `"${name}" is not a declared dependency of ${manifest.name}`,
      });
    }
  }
}

if (violations.length > 0) {
  console.error(`\n${manifest.name}:`);
  for (const { file, specifier, reason } of violations) {
    console.error(`  dist/${file}\n    "${specifier}" — ${reason}`);
  }
  console.error(
    `\n${violations.length} unresolvable reference(s) in emitted JavaScript and declarations.\n` +
      'Emitted files must not point outside this package, and relative specifiers must include a file extension.'
  );
  process.exit(1);
}

console.log(
  'Package declaration check passed: no unresolvable references in dist/.'
);
