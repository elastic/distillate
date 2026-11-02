/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spawnSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';

import { afterEach, describe, expect, it } from 'vitest';

const workflow = readFileSync(
  new URL('../.github/workflows/dependency-licenses.yml', import.meta.url),
  'utf8'
);
const [generate, commit] = workflow.split('\n  commit:\n');
const gate = / {4}if: >-\n([\s\S]*?) {4}runs-on:/.exec(generate)[1];
const script = / {8}run: \|\n([\s\S]*)/.exec(commit)[1];
const reports = ['THIRD_PARTY_LICENSES.md', 'NOTICE.txt'];
const temporaryDirectories = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe('dependency license workflow', () => {
  it.each([
    ['dependabot[bot]', 'elastic/distillate', true],
    ['elastic-renovate-prod[bot]', 'elastic/distillate', true],
    ['dependabot[bot]', 'someone/fork', false],
    ['elastic-renovate-prod[bot]', 'someone/fork', false],
    ['renovate[bot]', 'elastic/distillate', false],
    ['elastic-renovate-prod', 'elastic/distillate', false],
    ['app/elastic-renovate-prod', 'elastic/distillate', false],
    ['contributor', 'elastic/distillate', false],
  ])('gates author %s from %s to %s', (login, repository, allowed) => {
    expect(
      runInNewContext(gate, {
        github: {
          repository: 'elastic/distillate',
          event: {
            pull_request: {
              user: { login },
              head: { repo: { full_name: repository } },
            },
          },
        },
      })
    ).toBe(allowed);
  });

  it('keeps generation read-only and credentials out of PR code', () => {
    expect(generate).toContain('types: [opened, synchronize, reopened]');
    expect(generate).toContain('permissions:\n  contents: read');
    expect(generate).not.toContain('contents: write');
    expect(generate).not.toContain('actions: write');
    expect(generate).toContain(
      'pnpm install --frozen-lockfile --ignore-scripts'
    );
    expect(generate).toContain('persist-credentials: false');
    expect(commit).toContain('persist-credentials: false');
    expect(commit).toContain('needs: generate');
    expect(commit).not.toMatch(/run: pnpm/);
    expect(
      workflow.match(/ref: \$\{\{ github.event.pull_request.head.sha }}/g)
    ).toHaveLength(2);
    expect(commit).toContain(
      'HEAD_REF: ${{ github.event.pull_request.head.ref }}'
    );
    expect(commit).toContain(
      'HEAD_SHA: ${{ github.event.pull_request.head.sha }}'
    );
  });

  const runCommit = ({
    changed = true,
    stale = false,
    artifact = 'valid',
  } = {}) => {
    const directory = mkdtempSync(join(tmpdir(), 'dependency-licenses-'));
    temporaryDirectories.push(directory);
    const reportDirectory = join(directory, 'license-reports');
    mkdirSync(reportDirectory);
    for (const report of reports) {
      writeFileSync(join(reportDirectory, report), report);
    }
    if (artifact === 'missing') {
      rmSync(join(reportDirectory, reports[0]));
    } else if (artifact === 'symlink') {
      rmSync(join(reportDirectory, reports[0]));
      symlinkSync(
        join(reportDirectory, reports[1]),
        join(reportDirectory, reports[0])
      );
    }
    const calls = join(directory, 'calls');
    writeFileSync(calls, '');
    const result = spawnSync(
      'bash',
      [
        '-e',
        '-o',
        'pipefail',
        '-c',
        `
          git() {
            printf 'git %s\\n' "$*" >> "$CALLS"
            if [[ "$1 $2" == "diff --cached" ]]; then return "$CHANGED"; fi
            if [[ "$*" == *" push "* ]]; then return "$STALE"; fi
          }
          gh() { printf 'gh %s\\n' "$*" >> "$CALLS"; }
          cp() { printf 'cp %s\\n' "$*" >> "$CALLS"; }
          ${script}
        `,
      ],
      {
        encoding: 'utf8',
        env: {
          ...process.env,
          CALLS: calls,
          CHANGED: changed ? '1' : '0',
          STALE: stale ? '1' : '0',
          RUNNER_TEMP: directory,
          HEAD_REF: 'renovate/vite-6.x',
          HEAD_SHA: 'captured-head-sha',
          GITHUB_REPOSITORY: 'elastic/distillate',
        },
      }
    );
    return { ...result, calls: readFileSync(calls, 'utf8'), directory };
  };

  it('copies and stages only named reports, then dispatches CI after a leased push', () => {
    const result = runCommit();
    expect(result.status, result.stderr).toBe(0);
    expect(result.calls).toContain(
      'git add -- THIRD_PARTY_LICENSES.md NOTICE.txt\n'
    );
    expect(result.calls).toContain(
      'git -c core.hooksPath=/dev/null commit -m chore: refresh dependency license reports\n'
    );
    expect(result.calls).toContain(
      'git -c core.hooksPath=/dev/null push --force-with-lease=refs/heads/renovate/vite-6.x:captured-head-sha origin HEAD:refs/heads/renovate/vite-6.x\n' +
        'gh workflow run ci.yml --ref renovate/vite-6.x\n'
    );
    expect(result.calls.match(/^cp .+$/gm)).toEqual(
      reports.map(
        (report) =>
          `cp --remove-destination ${join(result.directory, 'license-reports', report)} ${report}`
      )
    );
  });

  it('does not commit or dispatch when reports are unchanged', () => {
    const result = runCommit({ changed: false });
    expect(result.status, result.stderr).toBe(0);
    expect(result.calls).not.toContain('commit -m');
    expect(result.calls).not.toContain(' push ');
    expect(result.calls).not.toContain('gh ');
  });

  it('fails a stale-head push without dispatching CI', () => {
    const result = runCommit({ stale: true });
    expect(result.status).not.toBe(0);
    expect(result.calls).toContain('--force-with-lease=');
    expect(result.calls).not.toContain('gh workflow run');
  });

  it.each(['missing', 'symlink'])(
    'rejects a %s report before writing',
    (artifact) => {
      const result = runCommit({ artifact });
      expect(result.status).not.toBe(0);
      expect(result.calls).toBe('');
    }
  );

  it('dispatches a CI workflow that checks licenses without filtering PRs', () => {
    const ci = readFileSync(
      new URL('../.github/workflows/ci.yml', import.meta.url),
      'utf8'
    );
    expect(ci).toContain('  pull_request:\n  workflow_dispatch:\n');
    expect(ci).toContain('name: typecheck / lint / test / build');
    expect(ci).toContain('run: pnpm licenses:report --check');
  });
});
