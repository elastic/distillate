/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { verifyRelease } from './semantic_release_verify_version.js';

const contextFor = ({ prepared, releasing, dryRun = false }) => {
  const cwd = mkdtempSync(join(tmpdir(), 'distillate-release-'));
  writeFileSync(
    join(cwd, 'package.json'),
    JSON.stringify({ name: '@elastic/distillate', version: prepared })
  );
  return {
    cwd,
    nextRelease: { version: releasing },
    options: { dryRun },
    logger: { log() {} },
  };
};

describe('verifyRelease', () => {
  it('passes when package.json matches the release', () => {
    expect(() =>
      verifyRelease({}, contextFor({ prepared: '0.1.0', releasing: '0.1.0' }))
    ).not.toThrow();
  });

  it('refuses to publish a version the prepared changelog does not describe', () => {
    expect(() =>
      verifyRelease({}, contextFor({ prepared: '0.1.0', releasing: '0.2.0' }))
    ).toThrow(/package\.json is 0\.1\.0 but this release is 0\.2\.0/);
  });

  it('stays out of the way during a dry run, when package.json is still behind', () => {
    expect(() =>
      verifyRelease(
        {},
        contextFor({ prepared: '0.1.0', releasing: '0.2.0', dryRun: true })
      )
    ).not.toThrow();
  });
});
