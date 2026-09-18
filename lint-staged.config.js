/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export default {
  '*.{js,cjs,ts,tsx}': 'eslint',
  '**/*.md': (filenames) => {
    const lintable = filenames.filter(
      (filename) => !filename.endsWith('CHANGELOG.md')
    );
    return lintable.length === 0
      ? []
      : `markdownlint-cli2 ${lintable
          .map((filename) => JSON.stringify(filename))
          .join(' ')}`;
  },
};
