/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolve } from 'node:path';

const changelogPath = resolve('CHANGELOG.md');

export default {
  '*.{js,cjs,ts,tsx}': 'eslint',
  '**/*.md': (filenames) => {
    const lintable = filenames.filter(
      (filename) => resolve(filename) !== changelogPath
    );
    return lintable.length === 0
      ? []
      : `markdownlint-cli2 ${lintable
          .map((filename) => JSON.stringify(filename))
          .join(' ')}`;
  },
};
