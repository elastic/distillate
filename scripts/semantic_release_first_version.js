/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const DEFAULT_FIRST_VERSION = '0.1.0';

const FIRST_RELEASE_CONSTANT = 'export const FIRST_RELEASE = "1.0.0";';

/** `FIRST_RELEASE` is both the first tag and `main`'s allowed range when there are no tags. */
export const patchFirstReleaseConstant = (source) => {
  if (!source.includes(FIRST_RELEASE_CONSTANT)) {
    throw new Error(
      'semantic-release constants.js no longer contains FIRST_RELEASE = "1.0.0"'
    );
  }
  return source.replace(
    FIRST_RELEASE_CONSTANT,
    `export const FIRST_RELEASE = "${DEFAULT_FIRST_VERSION}";`
  );
};
