/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  DEFAULT_FIRST_VERSION,
  patchFirstReleaseConstant,
} from './semantic_release_first_version.js';

const require = createRequire(import.meta.url);
const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const runnerUrl = new URL('./run_semantic_release.js', import.meta.url).href;

const PROBE = `const { default: getNextVersion } = await import(
  'semantic-release/lib/get-next-version.js'
);
const { FIRST_RELEASE } = await import(
  'semantic-release/lib/definitions/constants.js'
);
const { release } = await import('semantic-release/lib/branches/normalize.js');
const version = getNextVersion({
  branch: { type: 'release' },
  nextRelease: { type: 'minor' },
  lastRelease: {},
  logger: { log() {} },
});
const [{ range }] = release({ release: [{ name: 'main', tags: [] }] });
process.stdout.write(JSON.stringify({ firstRelease: FIRST_RELEASE, version, range }));
`;

const probeRelease = (registerLoader) => {
  const source = registerLoader
    ? `import { register } from 'node:module';
register('./semantic_release_loader.js', ${JSON.stringify(runnerUrl)});
${PROBE}`
    : PROBE;
  return JSON.parse(
    execFileSync(process.execPath, ['--input-type=module', '-e', source], {
      encoding: 'utf8',
      cwd: repoRoot,
    })
  );
};

describe('patchFirstReleaseConstant', () => {
  it('rewrites FIRST_RELEASE in semantic-release constants', () => {
    const source = readFileSync(
      require.resolve('semantic-release/lib/definitions/constants.js'),
      'utf8'
    );
    const patched = patchFirstReleaseConstant(source);
    expect(patched).toContain(
      `export const FIRST_RELEASE = "${DEFAULT_FIRST_VERSION}";`
    );
    expect(patched).not.toContain('export const FIRST_RELEASE = "1.0.0";');
  });

  it('throws when the constant is missing', () => {
    expect(() =>
      patchFirstReleaseConstant('export const FIRST_RELEASE = "2.0.0";')
    ).toThrow(/no longer contains FIRST_RELEASE = "1.0.0"/);
  });
});

describe('semantic_release_loader', () => {
  it('keeps 1.0.0 as the first version and main range without the loader', () => {
    expect(probeRelease(false)).toEqual({
      firstRelease: '1.0.0',
      version: '1.0.0',
      range: '>=1.0.0',
    });
  });

  it('sets 0.1.0 as the first version and allows it on main', () => {
    const probed = probeRelease(true);
    expect(probed).toEqual({
      firstRelease: DEFAULT_FIRST_VERSION,
      version: DEFAULT_FIRST_VERSION,
      range: `>=${DEFAULT_FIRST_VERSION}`,
    });
  });
});
