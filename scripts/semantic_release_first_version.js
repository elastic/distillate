/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const DEFAULT_FIRST_VERSION = '0.1.0';

const FIRST_RELEASE_FALLBACK = ': FIRST_RELEASE;';

/**
 * semantic-release clones plugin context, so `verifyRelease` cannot change `nextRelease.version`.
 * Rewrite the no-previous-release branch of `get-next-version.js` instead.
 */
export const patchGetNextVersionSource = (source) => {
  if (!source.includes(FIRST_RELEASE_FALLBACK)) {
    throw new Error(
      'semantic-release get-next-version.js no longer contains the first-release fallback to patch'
    );
  }
  return source.replace(
    FIRST_RELEASE_FALLBACK,
    `: '${DEFAULT_FIRST_VERSION}';`
  );
};
