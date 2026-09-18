/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Refuse to publish a version the changelog on `main` does not describe, which happens when a
 * release-driving commit lands between `prepare-release.yml` and the publish.
 * Runs before `@semantic-release/npm` writes the new version into `package.json`.
 */
export const verifyRelease = (_pluginConfig, context) => {
  const { cwd, nextRelease, options, logger } = context;
  if (options.dryRun) {
    return;
  }

  const { version } = JSON.parse(
    readFileSync(resolve(cwd, 'package.json'), 'utf8')
  );
  if (version !== nextRelease.version) {
    throw new Error(
      `package.json is ${version} but this release is ${nextRelease.version}. Run "Prepare a Release" and merge its pull request first.`
    );
  }

  logger.log('package.json matches the release version %s.', version);
};
