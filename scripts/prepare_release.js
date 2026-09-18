/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { register } from 'node:module';
import { resolve } from 'node:path';

import { composeChangelog } from './release_changelog.js';

register('./semantic_release_loader.js', import.meta.url);

const readIfPresent = (path) => {
  try {
    return readFileSync(path, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') {
      return '';
    }
    throw error;
  }
};

// `prepare` and `publish` are skipped in dry-run, so this computes the version and notes
// without tagging, pushing, or publishing. See semantic-release lib/definitions/plugins.js.
const { default: semanticRelease } = await import('semantic-release');
const result = await semanticRelease({ dryRun: true });

if (!result) {
  console.log('No release is due; nothing to prepare.');
  process.exit(0);
}

const {
  nextRelease: { version, notes },
} = result;
const cwd = process.cwd();

const changelogPath = resolve(cwd, 'CHANGELOG.md');
writeFileSync(
  changelogPath,
  composeChangelog(notes, readIfPresent(changelogPath))
);

const packagePath = resolve(cwd, 'package.json');
const packageJson = readFileSync(packagePath, 'utf8');
const manifest = JSON.parse(packageJson);
manifest.version = version;
const serialized = JSON.stringify(manifest, null, 2);
// `package.json` has no trailing newline; adding one would show up in every release diff.
writeFileSync(
  packagePath,
  packageJson.endsWith('\n') ? `${serialized}\n` : serialized
);

const { RELEASE_NOTES_FILE, GITHUB_OUTPUT } = process.env;
if (RELEASE_NOTES_FILE) {
  writeFileSync(RELEASE_NOTES_FILE, `${notes.trim()}\n`);
}
if (GITHUB_OUTPUT) {
  appendFileSync(GITHUB_OUTPUT, `version=${version}\n`);
}

console.log(`Prepared ${version}.`);
