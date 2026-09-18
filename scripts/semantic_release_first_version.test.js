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
  patchGetNextVersionSource,
} from './semantic_release_first_version.js';

const require = createRequire(import.meta.url);
const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const runnerUrl = new URL('./run_semantic_release.js', import.meta.url).href;

const GET_NEXT_VERSION = `const { default: getNextVersion } = await import(
  'semantic-release/lib/get-next-version.js'
);
const version = getNextVersion({
  branch: { type: 'release' },
  nextRelease: { type: 'minor' },
  lastRelease: {},
  logger: { log() {} },
});
process.stdout.write(version);
`;

const runGetNextVersion = (registerLoader) => {
  const source = registerLoader
    ? `import { register } from 'node:module';
register('./semantic_release_loader.js', ${JSON.stringify(runnerUrl)});
${GET_NEXT_VERSION}`
    : GET_NEXT_VERSION;
  return execFileSync(process.execPath, ['--input-type=module', '-e', source], {
    encoding: 'utf8',
    cwd: repoRoot,
  });
};

describe('patchGetNextVersionSource', () => {
  it('rewrites the no-previous-release fallback in semantic-release', () => {
    const source = readFileSync(
      require.resolve('semantic-release/lib/get-next-version.js'),
      'utf8'
    );
    const patched = patchGetNextVersionSource(source);
    expect(patched).toContain(`: '${DEFAULT_FIRST_VERSION}';`);
    expect(patched).not.toContain(': FIRST_RELEASE;');
    expect(patched).toContain('${FIRST_RELEASE}-');
  });

  it('throws when the fallback is missing', () => {
    expect(() =>
      patchGetNextVersionSource('export default () => "1.0.0";')
    ).toThrow(/no longer contains the first-release fallback/);
  });
});

describe('semantic_release_loader', () => {
  it('returns 1.0.0 with no previous release when the loader is not registered', () => {
    expect(runGetNextVersion(false)).toBe('1.0.0');
  });

  it('returns 0.1.0 with no previous release when the loader is registered', () => {
    expect(runGetNextVersion(true)).toBe(DEFAULT_FIRST_VERSION);
  });
});
