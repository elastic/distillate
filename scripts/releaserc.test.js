/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyzeCommits } from '@semantic-release/commit-analyzer';
import { generateNotes } from '@semantic-release/release-notes-generator';
import { describe, expect, it } from 'vitest';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));

const {
  plugins: [[, config]],
} = JSON.parse(readFileSync(join(repoRoot, '.releaserc.json'), 'utf-8'));

const context = (...messages) => ({
  commits: messages.map((message, index) => ({
    hash: `${index}`.padStart(40, '0'),
    message,
  })),
  cwd: repoRoot,
  lastRelease: {},
  logger: { log() {} },
  nextRelease: { gitTag: 'v1.0.0', version: '1.0.0' },
  options: { repositoryUrl: 'https://github.com/elastic/distillate.git' },
});

describe('.releaserc.json commit analysis', () => {
  it.each([
    ['feat!: drop x', 'major'],
    ['fix(sdk)!: drop x', 'major'],
    ['feat: add y\n\nBREAKING CHANGE: drop x', 'major'],
    ['feat: add y', 'minor'],
    ['fix: repair z', 'patch'],
    ['chore: tidy', null],
  ])('%j releases %s', async (message, release) => {
    expect(await analyzeCommits(config, context(message))).toBe(release);
  });

  it('lists a `!` header under breaking changes in the notes', async () => {
    const notes = await generateNotes(
      config,
      context('feat!: drop x', 'feat: add y')
    );
    const [, breaking = ''] = notes.split('BREAKING CHANGES');
    expect(breaking).toContain('drop x');
    expect(breaking).not.toContain('add y');
  });
});
