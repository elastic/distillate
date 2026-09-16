/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { existsSync, globSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const bundle = '.okf/distillate';

const LOCAL_PATH =
  /`((?:src|docs|scripts|\.github|\.okf)\/[^`\s]*|(?:AGENTS|README|CONTRIBUTING|LICENSE|NOTICE|THIRD_PARTY_LICENSES)\.md|LICENSE\.txt|NOTICE\.txt|package\.json)`/g;
const RESOURCE = /^\s*(?:-\s+)?resource:\s+(\S+)\s*$/gm;
const GITHUB_RESOURCE =
  /^https:\/\/github\.com\/elastic\/distillate\/blob\/main\/(.+)$/;

/**
 * @param {string} path
 */
const cleanPath = (path) =>
  decodeURIComponent(path)
    .replace(/[#?].*$/, '')
    .replace(/[.,;:]$/, '');

/**
 * @param {string} resource
 */
const localResourcePath = (resource) => {
  if (/^(?:src|docs|scripts|\.github|\.okf)\/.+$/.test(resource)) {
    return cleanPath(resource);
  }

  const github = resource.match(GITHUB_RESOURCE);
  return github ? cleanPath(github[1] ?? '') : undefined;
};

const files = globSync(`${bundle}/**/*.md`, { cwd: root });
/** @type {Array<{ file: string; path: string }>} */
const misses = [];
let checked = 0;

for (const file of files) {
  const text = readFileSync(resolve(root, file), 'utf8');
  /** @type {Set<string>} */
  const cited = new Set();

  for (const match of text.matchAll(LOCAL_PATH)) {
    const path = match[1];
    if (path) {
      cited.add(cleanPath(path));
    }
  }
  for (const match of text.matchAll(RESOURCE)) {
    const resource = match[1];
    const path = resource ? localResourcePath(resource) : undefined;
    if (path) {
      cited.add(path);
    }
  }

  for (const path of cited) {
    if (path.includes('*')) {
      continue;
    }
    checked += 1;
    if (!existsSync(resolve(root, path))) {
      misses.push({ file, path });
    }
  }
}

if (misses.length > 0) {
  globalThis.console.error(
    `${misses.length} OKF anchor(s) no longer resolve. Either the code moved or the concept cited the wrong path:\n`
  );
  for (const { file, path } of misses) {
    globalThis.console.error(`  ${file} -> ${path}`);
  }
  globalThis.process.exit(1);
}

globalThis.console.log(
  `OKF anchors OK: ${checked} path citations across ${files.length} files resolve.`
);
