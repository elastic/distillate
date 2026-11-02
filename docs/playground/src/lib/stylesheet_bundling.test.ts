/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import { expect, it } from 'vitest';

it.each([
  { mode: 'sideEffects:false', sideEffects: false, target: 'readable' },
  {
    mode: 'barrel-only exemption',
    sideEffects: ['./dist/styles/index.js'],
    target: 'readable',
  },
  {
    mode: 'style-file exemptions, unmarked barrel',
    sideEffects: ['**/*.styles.js'],
    target: 'readable',
    barrel: true,
    retained: false,
  },
  {
    mode: 'style-file and barrel exemptions',
    sideEffects: ['**/*.styles.js', './dist/styles/index.js'],
    target: 'readable',
    barrel: true,
    retained: true,
  },
  {
    mode: 'style-file exemptions, readable',
    sideEffects: ['**/*.styles.js'],
    target: 'readable',
  },
  {
    mode: 'style-file exemptions, compact',
    sideEffects: ['**/*.styles.js'],
    target: 'compact',
  },
  {
    mode: 'style-file exemptions, artifact',
    sideEffects: ['**/*.styles.js'],
    target: 'artifact',
  },
] as const)('bundles a published library with $mode', async (testCase) => {
  const { sideEffects, target } = testCase;
  const barrel =
    'barrel' in testCase
      ? testCase.barrel
      : sideEffects === false || sideEffects[0] === './dist/styles/index.js';
  const retained = 'retained' in testCase ? testCase.retained : !barrel;
  const root = await mkdtemp(join(tmpdir(), 'distillate-stylesheet-'));
  try {
    const library = join(root, 'node_modules', 'style-library');
    const dist = join(library, 'dist');
    const styles = join(dist, 'styles');
    await mkdir(styles, { recursive: true });
    await writeFile(
      join(library, 'package.json'),
      JSON.stringify({
        name: 'style-library',
        type: 'module',
        sideEffects,
        exports: {
          '.': './dist/styles/index.js',
          './stylesheet': './dist/stylesheet.js',
        },
      })
    );
    await writeFile(
      join(dist, 'environment.js'),
      `import { createDistillery } from '@elastic/distillate';
export const distillery = createDistillery({
  prefix: 'test',
  themeScope: '.test',
  theme: { ink: 'purple' },
});`
    );
    for (const name of ['button', 'panel']) {
      await writeFile(
        join(styles, `${name}.styles.js`),
        `import { variants } from '@elastic/distillate';
import { distillery } from '../environment.js';
export const ${name} = distillery.createStyleModule('${name}', ({ css, tokens }) => ({
  root: css\`color: \${tokens.ink};\`,
  tone: variants(['accent'], () => css\`background: orange;\`),
}));`
      );
    }
    await writeFile(
      join(styles, 'unused.js'),
      `export const unused = 'UNUSED_EXPORT_SENTINEL';`
    );
    await writeFile(
      join(styles, 'index.js'),
      `export * from './button.styles.js';
export * from './panel.styles.js';
export * from './unused.js';
export { distillery } from '../environment.js';`
    );
    await writeFile(
      join(dist, 'stylesheet.js'),
      `${
        barrel
          ? "import './styles/index.js';"
          : "import './styles/button.styles.js';\nimport './styles/panel.styles.js';"
      }
import { distillery } from './environment.js';
export const stylesheet = () =>
  distillery.renderStyles(distillery.stylesheetCollector('${target === 'compact' ? 'compact' : 'readable'}'));`
    );
    const entry = join(root, 'entry.js');
    await writeFile(
      entry,
      target === 'artifact'
        ? `import { button, distillery } from 'style-library';
export const stylesheet = () => {
  const collector = distillery.artifactCollector('readable');
  collector.use(button.handles.root);
  return distillery.renderStyles(collector);
};`
        : `export { stylesheet } from 'style-library/stylesheet';`
    );

    const result = await build({
      configFile: false,
      root,
      logLevel: 'silent',
      resolve: {
        alias: {
          '@elastic/distillate': fileURLToPath(
            new URL('../../../../src/index.ts', import.meta.url)
          ),
        },
      },
      build: {
        write: false,
        minify: false,
        lib: { entry, formats: ['cjs'] },
      },
    });
    const output = Array.isArray(result) ? result[0] : result;
    if (!output || !('output' in output)) {
      throw new Error('Expected one Rollup output');
    }
    const chunk = output.output.find((item) => item.type === 'chunk');
    if (!chunk || chunk.type !== 'chunk') {
      throw new Error('Expected a bundled stylesheet entry');
    }
    expect(chunk.code).not.toContain('UNUSED_EXPORT_SENTINEL');
    const css = execFileSync(
      process.execPath,
      ['-e', `${chunk.code}\nprocess.stdout.write(exports.stylesheet());`],
      { encoding: 'utf8' }
    );

    if (!retained) {
      expect(css).toBe('');
    } else if (target === 'artifact') {
      expect(css).toBe(
        '.test{--test-ink:purple}.button-root{color:var(--test-ink)}'
      );
    } else {
      expect(css.match(/\{color:var\(/g)).toHaveLength(2);
      expect(css.match(/\{background:orange\}/g)).toHaveLength(2);
      expect(css).toContain(':purple');
      if (target === 'readable') {
        expect(css).toContain('.button-root{color:var(--test-ink)}');
        expect(css).toContain('.panel-root{color:var(--test-ink)}');
      } else {
        expect(css).not.toContain('button-root');
        expect(css).not.toContain('panel-root');
      }
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
