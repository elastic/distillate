/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

'use strict';

// Runs as its own process, spawned by smoke_exports.js. This file only ever
// `require()`s the package — never `import()`s it — so it never shares a
// process with the ESM checks. Mixing `import` and `require` on the same
// package in one process is the dual-package hazard documented in
// single-copy.md; keeping this isolated means the duplicate-instance
// `console.warn` only ever fires here for a real problem, not as expected
// noise on every run.

const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');

const repoRoot = resolve(__dirname, '..');
const manifest = JSON.parse(
  readFileSync(resolve(repoRoot, 'package.json'), 'utf-8')
);

// Resolve by package name (self-reference) so this goes through the
// "require" export condition, the same path a real consumer takes.
const distillate = require('@elastic/distillate');
const emotion = require('@elastic/distillate/emotion');
const testing = require('@elastic/distillate/testing');

const requiredExports = [
  ['@elastic/distillate (cjs)', distillate.createDistillery],
  ['@elastic/distillate.createDomSink (cjs)', distillate.createDomSink],
  ['@elastic/distillate/emotion (cjs)', emotion.createEmotion],
  ['@elastic/distillate/emotion.createDomSink (cjs)', emotion.createDomSink],
  ['@elastic/distillate/testing (cjs)', testing.assertVarRefsHaveDeclarations],
  [
    '@elastic/distillate/testing.findVarRefViolations (cjs)',
    testing.findVarRefViolations,
  ],
];

const missing = requiredExports
  .filter(([, value]) => value === undefined)
  .map(([name]) => name);

if (missing.length > 0) {
  throw new Error(`Missing CJS package exports: ${missing.join(', ')}`);
}

// Nothing above exercises "main": with an "exports" map present, Node
// resolves the "require" condition and never consults it. Require the
// literal file "main" names so a future drift between "main" and
// "exports['.'].require" still gets caught. (Today they point at the same
// file, so this hits Node's module cache rather than re-executing it — no
// duplicate-instance warning.)
const mainEntry = require(resolve(repoRoot, manifest.main));
if (typeof mainEntry.createDistillery !== 'function') {
  throw new Error(`"main" (${manifest.main}) does not export createDistillery`);
}

// Checking that the exports are functions only proves the shape compiled;
// it does not prove the compiled graph runs (stylis interop first executes
// here). Exercise one representative render through each entry point.
const distillery = distillate.createDistillery({
  prefix: 'smoke',
  themeScope: '.smoke-view',
  theme: { colors: { ink: distillate.lightDark('#111', '#eee') } },
});
const smokeModule = distillery.createStyleModule(
  'smoke',
  ({ css, tokens }) => ({
    root: css`
      color: ${tokens.colors.ink};
    `,
  })
);
const collector = distillery.artifactCollector('compact');
collector.use(smokeModule.handles.root);
const rendered = distillery.renderStyles(collector);
if (typeof rendered !== 'string' || rendered.length === 0) {
  throw new Error('CJS root build rendered no CSS');
}

const live = distillery.liveCollection();
if (live.resolveClassName(smokeModule.handles.root) !== 'smoke-root') {
  throw new Error('CJS live collection returned the wrong class name');
}
if (!live.css().includes('.smoke-root{')) {
  throw new Error('CJS live collection rendered no CSS');
}

const { css: emotionCss } = emotion.createEmotion(distillery);
const emotionHandle = emotionCss`
  color: red;
`;
if (String(emotionHandle).length === 0) {
  throw new Error('CJS emotion build produced an empty class name');
}

const violations = testing.findVarRefViolations(rendered);
if (!Array.isArray(violations)) {
  throw new Error('CJS testing build did not return an array');
}

console.log(
  `CJS package export check passed: ${requiredExports.length} required, "main" and one rendered path per entry point verified.`
);
