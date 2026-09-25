/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Resolve by package name (Node's package self-reference), not by relative
// dist path, so this exercises the same "exports" conditions an external
// consumer's `import` goes through. A relative `dist/index.js` read would
// still pass even if an export condition path were wrong.
const distillate = await import('@elastic/distillate');
const emotion = await import('@elastic/distillate/emotion');
const testing = await import('@elastic/distillate/testing');

const requiredExports = [
  ['@elastic/distillate', distillate.createDistillery],
  ['@elastic/distillate.createDomSink', distillate.createDomSink],
  ['@elastic/distillate/emotion', emotion.createEmotion],
  ['@elastic/distillate/emotion.createDomSink', emotion.createDomSink],
  ['@elastic/distillate/testing', testing.assertVarRefsHaveDeclarations],
  [
    '@elastic/distillate/testing.findVarRefViolations',
    testing.findVarRefViolations,
  ],
];

const forbiddenExports = [
  ['@elastic/distillate.minifyCss', distillate.minifyCss],
  [
    '@elastic/distillate.assertVarRefsHaveDeclarations',
    distillate.assertVarRefsHaveDeclarations,
  ],
  ['@elastic/distillate.findVarRefViolations', distillate.findVarRefViolations],
  [
    '@elastic/distillate.collectDeclaredCustomProperties',
    distillate.collectDeclaredCustomProperties,
  ],
  [
    '@elastic/distillate.collectReferencedCustomProperties',
    distillate.collectReferencedCustomProperties,
  ],
  ['@elastic/distillate.compactNameForIndex', distillate.compactNameForIndex],
  ['@elastic/distillate.createCompactNameMap', distillate.createCompactNameMap],
  [
    '@elastic/distillate.createStyleModuleWithEnvironment',
    distillate.createStyleModuleWithEnvironment,
  ],
];

const missing = requiredExports
  .filter(([, value]) => value === undefined)
  .map(([name]) => name);

if (missing.length > 0) {
  throw new Error(`Missing package exports: ${missing.join(', ')}`);
}

const leaked = forbiddenExports
  .filter(([, value]) => value !== undefined)
  .map(([name]) => name);

if (leaked.length > 0) {
  throw new Error(`Forbidden package exports: ${leaked.join(', ')}`);
}

console.log(
  `Package export check passed: ${requiredExports.length} required, ${forbiddenExports.length} forbidden.`
);

// The CommonJS build (reached via the "require" export condition and
// "main") runs in a separate process rather than inline here. Loading both
// builds via `import` and `require` in one process is exactly the
// dual-package hazard documented in single-copy.md: it would make this
// script's own duplicate-instance `console.warn` fire on every run,
// drowning out a real one. See smoke_exports_cjs.cjs.
const cjsCheck = resolve(
  dirname(fileURLToPath(import.meta.url)),
  'smoke_exports_cjs.cjs'
);
execFileSync(process.execPath, [cjsCheck], { stdio: 'inherit' });
