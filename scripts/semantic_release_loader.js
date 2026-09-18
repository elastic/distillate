/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { patchFirstReleaseConstant } from './semantic_release_first_version.js';

const TARGET = /semantic-release\/lib\/definitions\/constants\.js$/;

export const load = async (url, context, nextLoad) => {
  const result = await nextLoad(url, context);
  if (!TARGET.test(url.split('?')[0])) {
    return result;
  }
  const { source: raw } = result;
  if (raw == null) {
    throw new Error(
      'semantic-release constants.js source unavailable to patch'
    );
  }
  const text =
    typeof raw === 'string' ? raw : Buffer.from(raw).toString('utf8');
  return {
    format: result.format ?? 'module',
    shortCircuit: true,
    source: patchFirstReleaseConstant(text),
  };
};
