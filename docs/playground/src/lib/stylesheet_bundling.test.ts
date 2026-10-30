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

it.each(['registry', 'explicit-readable', 'explicit-compact'] as const)(
  'bundles a sideEffects:false library stylesheet using %s collection',
  async (mode) => {
    const root = await mkdtemp(join(tmpdir(), 'distillate-stylesheet-'));
    try {
      const library = join(root, 'node_modules', 'style-library');
      await mkdir(library, { recursive: true });
      await writeFile(
        join(library, 'package.json'),
        JSON.stringify({
          name: 'style-library',
          type: 'module',
          sideEffects: false,
          exports: './stylesheet.js',
        })
      );
      await writeFile(
        join(library, 'environment.js'),
        `import { createDistillery } from '@elastic/distillate';
export const distillery = createDistillery({
  prefix: 'test',
  themeScope: '.test',
  theme: { ink: 'purple' },
});`
      );
      for (const name of ['button', 'panel']) {
        await writeFile(
          join(library, `${name}.js`),
          `import { variants } from '@elastic/distillate';
import { distillery } from './environment.js';
export const ${name} = distillery.createStyleModule('${name}', ({ css, tokens }) => ({
  root: css\`color: \${tokens.ink};\`,
  tone: variants(['accent'], () => css\`background: orange;\`),
}));`
        );
      }
      const options =
        mode === 'registry'
          ? ''
          : mode === 'explicit-readable'
            ? '{ modules: [button, panel] }'
            : "'compact', { modules: [button, panel] }";
      await writeFile(
        join(library, 'stylesheet.js'),
        `import { button } from './button.js';
import { panel } from './panel.js';
import { distillery } from './environment.js';
export const stylesheet = () =>
  distillery.renderStyles(distillery.stylesheetCollector(${options}));`
      );
      const entry = join(root, 'entry.js');
      await writeFile(entry, `export { stylesheet } from 'style-library';`);

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
      const css = execFileSync(
        process.execPath,
        ['-e', `${chunk.code}\nprocess.stdout.write(exports.stylesheet());`],
        { encoding: 'utf8' }
      );

      if (mode === 'registry') {
        expect(css).toBe('');
      } else {
        expect(css.match(/\{color:var\(/g)).toHaveLength(2);
        expect(css.match(/\{background:orange\}/g)).toHaveLength(2);
        expect(css).toContain(':purple');
        if (mode === 'explicit-readable') {
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
  }
);
