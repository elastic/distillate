/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *	http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
