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

const distillate = await import('../dist/index.js');
const emotion = await import('../dist/emotion.js');
const testing = await import('../dist/testing.js');

const requiredExports = [
  ['@elastic/distillate', distillate.createDistillery],
  ['@elastic/distillate/emotion', emotion.createEmotion],
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
