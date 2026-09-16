/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// The package root declares "type": "module" so bundlers and Node resolve
// dist/**/*.js as ESM by default. dist/cjs holds a parallel CommonJS build
// (tsconfig.build.cjs.json) for consumers that can only `require(...)` —
// notably plugin-host platforms (Kibana-style) whose server code is
// transpiled to CommonJS. This nested manifest overrides the module system
// for that subtree only, per Node's documented dual-package layout:
// https://nodejs.org/api/packages.html#dual-commonjses-module-packages

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cjsDir = resolve(repoRoot, 'dist/cjs');

mkdirSync(cjsDir, { recursive: true });
writeFileSync(
  resolve(cjsDir, 'package.json'),
  `${JSON.stringify({ type: 'commonjs' }, null, 2)}\n`
);

console.log('Wrote dist/cjs/package.json ({ "type": "commonjs" }).');
