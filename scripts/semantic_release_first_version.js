/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const DEFAULT_FIRST_VERSION = '0.1.0';

/** semantic-release hardcodes the first tag as 1.0.0; override it for this package. */
export const verifyRelease = (pluginConfig, context) => {
  const { lastRelease, nextRelease, branch, options, logger } = context;
  if (lastRelease.version || branch.type === 'prerelease') {
    return;
  }

  const version = pluginConfig.version ?? DEFAULT_FIRST_VERSION;
  const tagFormat = options.tagFormat ?? 'v${version}';
  nextRelease.version = version;
  nextRelease.gitTag = tagFormat.replace('${version}', version);
  nextRelease.name = nextRelease.gitTag;
  logger.log('No previous release; next version is %s', version);
};
