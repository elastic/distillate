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

import { createRequire } from 'node:module';

// Resolve by package name (Node's package self-reference), not by relative
// dist path, so this exercises the same "exports" conditions (and "main")
// an external consumer's `import`/`require` goes through. A relative
// `dist/index.js` read would still pass even if an export condition path
// were wrong.
const distillate = await import('@elastic/distillate');
const emotion = await import('@elastic/distillate/emotion');
const testing = await import('@elastic/distillate/testing');

// Also smoke-test the CommonJS build reached via the "require" export
// condition (and "main"). Loading both builds in one process is the
// dual-package hazard documented in single-copy.md, but this script only
// checks shapes and exits, so the two copies never coexist at steady state.
const require = createRequire(import.meta.url);
const distillateCjs = require('@elastic/distillate');
const emotionCjs = require('@elastic/distillate/emotion');
const testingCjs = require('@elastic/distillate/testing');

const requiredExports = [
  ['@elastic/distillate', distillate.createDistillery],
  ['@elastic/distillate/emotion', emotion.createEmotion],
  ['@elastic/distillate/testing', testing.assertVarRefsHaveDeclarations],
  [
    '@elastic/distillate/testing.findVarRefViolations',
    testing.findVarRefViolations,
  ],
  ['@elastic/distillate (cjs)', distillateCjs.createDistillery],
  ['@elastic/distillate/emotion (cjs)', emotionCjs.createEmotion],
  [
    '@elastic/distillate/testing (cjs)',
    testingCjs.assertVarRefsHaveDeclarations,
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
