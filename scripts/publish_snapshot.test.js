/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  publishSnapshot,
  repoRoot,
  snapshotVersion,
} from './publish_snapshot.js';

const SHA = '1f6b018e0c2d4e6f8a0b1c2d3e4f5a6b7c8d9e0f';
const SNAPSHOT = '0.2.1-main.20261020203334.g1f6b018';

// https://semver.org/#is-there-a-suggested-regular-expression-regex-to-check-a-semver-string
const SEMVER =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

vi.mock('node:child_process', () => ({ execFileSync: vi.fn() }));
vi.mock('node:fs', async (importOriginal) => ({
  ...(await importOriginal()),
  writeFileSync: vi.fn(),
}));
vi.spyOn(console, 'log').mockImplementation(() => {});

let published = false;

beforeEach(() => {
  vi.mocked(execFileSync).mockImplementation((command, args) => {
    if (command === 'git') {
      return {
        describe: 'v0.2.0\n',
        'rev-parse': `${SHA}\n`,
        show: '2026-10-20T16:33:34-04:00\n',
      }[args[0]];
    }
    if (command === 'npm' && args[0] === 'view') {
      return published ? `${SNAPSHOT}\n` : '';
    }
    return '';
  });
});

afterEach(() => {
  published = false;
  vi.clearAllMocks();
});

const publishCalls = () =>
  vi
    .mocked(execFileSync)
    .mock.calls.filter(
      ([command, args]) => command === 'npm' && args[0] === 'publish'
    );

describe('publishSnapshot', () => {
  it('publishes the package under next', () => {
    publishSnapshot({ dryRun: false });
    const [[, args, options]] = publishCalls();
    expect(args).toEqual(['publish', '--access', 'public', '--tag', 'next']);
    expect(options).toMatchObject({ cwd: repoRoot });
  });

  it('writes the snapshot version into package.json first', () => {
    publishSnapshot({ dryRun: false });
    const [[path, text]] = vi.mocked(writeFileSync).mock.calls;
    expect(path).toBe(join(repoRoot, 'package.json'));
    expect(JSON.parse(text)).toMatchObject({
      name: '@elastic/distillate',
      version: SNAPSHOT,
    });
  });

  it('builds on the latest stable release tag, skipping prereleases', () => {
    publishSnapshot({ dryRun: false });
    const [[, args]] = vi
      .mocked(execFileSync)
      .mock.calls.filter(
        ([command, args]) => command === 'git' && args[0] === 'describe'
      );
    expect(args).toEqual(
      expect.arrayContaining(['--match', 'v[0-9]*', '--exclude', '*-*'])
    );
  });

  it('passes --dry-run to npm publish', () => {
    publishSnapshot({ dryRun: true });
    expect(publishCalls()[0][1].at(-1)).toBe('--dry-run');
  });

  it('does nothing when the commit is already published', () => {
    published = true;
    publishSnapshot({ dryRun: false });
    expect(publishCalls()).toEqual([]);
    expect(vi.mocked(writeFileSync)).not.toHaveBeenCalled();
  });
});

describe('snapshotVersion', () => {
  const version = (overrides) =>
    snapshotVersion({
      releaseTag: 'v0.2.0',
      sha: SHA,
      time: '2026-10-20T16:33:34-04:00',
      ...overrides,
    });

  it('is a prerelease of the next patch, stamped with the UTC commit time', () => {
    expect(version()).toBe(SNAPSHOT);
  });

  it('is valid semver even for an all-digit sha with a leading zero', () => {
    expect(version({ sha: '0123456789' })).toMatch(SEMVER);
  });

  it('orders later commits after earlier ones', () => {
    const stamp = (v) => v.split('.')[3];
    expect(
      stamp(version({ time: '2026-10-21T00:00:00Z' })) > stamp(version())
    ).toBe(true);
  });

  it('refuses a tag that is not a release', () => {
    expect(() => version({ releaseTag: 'v0.2.0-beta.1' })).toThrow(
      'not a release tag'
    );
  });
});

describe('release.yml push paths', () => {
  const read = (path) => readFileSync(join(repoRoot, path), 'utf-8');

  const pushPaths = () => {
    const block = /^ {4}paths:\n((?: {6}- .+\n)+)/m.exec(
      read('.github/workflows/release.yml')
    );
    return block[1].split('\n').flatMap((line) => {
      const path = line.trim().replace(/^- /, '');
      return path ? [path] : [];
    });
  };

  // `extends` chains of the given tsconfig files, including the files themselves.
  const withExtends = (paths) =>
    paths.flatMap((path) => {
      const { extends: parent } = JSON.parse(read(path));
      return parent
        ? [path, ...withExtends([join(dirname(path), parent)])]
        : [path];
    });

  it('covers every published file, every build input, and the snapshot itself', () => {
    const { files, scripts } = JSON.parse(read('package.json'));
    const published = files
      .filter((entry) => !entry.startsWith('!') && entry !== 'dist')
      .map((entry) => (/\.\w+$/.test(entry) ? entry : `${entry}/**`));
    const build = Object.entries(scripts)
      .filter(([name]) => /^(build|docs:api)/.test(name))
      .flatMap(([, command]) =>
        [...command.matchAll(/(?:scripts\/\S+\.js|tsconfig\S*\.json)/g)].map(
          ([path]) => path
        )
      );
    const tsconfigs = withExtends(
      build.filter((path) => path.startsWith('tsconfig'))
    );
    expect(new Set(pushPaths())).toEqual(
      new Set([
        ...published,
        ...build,
        ...tsconfigs,
        // npm packs the README whatever `files` says.
        'README.md',
        'typedoc.json',
        'package.json',
        'pnpm-lock.yaml',
        'scripts/publish_snapshot.js',
        '.github/workflows/release.yml',
      ])
    );
  });
});
