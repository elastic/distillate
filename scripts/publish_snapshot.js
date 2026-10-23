/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Publishes a prerelease of `@elastic/distillate` from the checkout under the `next` dist-tag, with no git tag or
 * commit.
 *
 * Usage: `node scripts/publish_snapshot.js [--dry-run]`.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

export const SNAPSHOT_TAG = 'next';

export const repoRoot = fileURLToPath(new URL('..', import.meta.url));

const RELEASE_TAG = /^v(\d+)\.(\d+)\.(\d+)$/;

/**
 * `<release + 1 patch>-main.<UTC commit time>.g<short sha>`: after the release it builds on, before any later one,
 * ordered by commit time. The `g` keeps an all-digit sha from being a numeric identifier with a leading zero.
 */
export const snapshotVersion = ({ releaseTag, sha, time }) => {
  const match = RELEASE_TAG.exec(releaseTag);
  if (match === null) {
    throw new Error(`${releaseTag} is not a release tag`);
  }
  const [, major, minor, patch] = match;
  const stamp = new Date(time).toISOString().replace(/\D/g, '').slice(0, 14);
  return `${major}.${minor}.${Number(patch) + 1}-main.${stamp}.g${sha.slice(0, 7)}`;
};

const git = (args) =>
  execFileSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'inherit'],
  }).trim();

const isPublished = (name, version) => {
  try {
    return (
      execFileSync('npm', ['view', `${name}@${version}`, 'version'], {
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim() !== ''
    );
  } catch {
    return false;
  }
};

/** Writes the snapshot version into `package.json`, then publishes under `next`. The manifest is left rewritten; this runs in a throwaway CI checkout. */
export const publishSnapshot = ({ dryRun }) => {
  const manifestPath = join(repoRoot, 'package.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
  const snapshot = snapshotVersion({
    releaseTag: git([
      'describe',
      '--tags',
      '--abbrev=0',
      '--match',
      'v[0-9]*',
      '--exclude',
      '*-*',
      'HEAD',
    ]),
    sha: git(['rev-parse', 'HEAD']),
    time: git(['show', '-s', '--format=%cI', 'HEAD']),
  });
  if (isPublished(manifest.name, snapshot)) {
    console.log('%s is already published; nothing to do', snapshot);
    return;
  }
  writeFileSync(
    manifestPath,
    `${JSON.stringify({ ...manifest, version: snapshot }, null, 2)}\n`
  );
  console.log(
    'Publishing %s at %s under %s',
    manifest.name,
    snapshot,
    SNAPSHOT_TAG
  );
  execFileSync(
    'npm',
    [
      'publish',
      '--access',
      'public',
      '--tag',
      SNAPSHOT_TAG,
      ...(dryRun ? ['--dry-run'] : []),
    ],
    { cwd: repoRoot, stdio: 'inherit' }
  );
};

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const {
    values: { 'dry-run': dryRun },
  } = parseArgs({
    options: { 'dry-run': { default: false, type: 'boolean' } },
  });
  publishSnapshot({ dryRun });
}
