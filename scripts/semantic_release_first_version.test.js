/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  DEFAULT_FIRST_VERSION,
  patchGetNextVersionSource,
} from './semantic_release_first_version.js';

const require = createRequire(import.meta.url);

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
