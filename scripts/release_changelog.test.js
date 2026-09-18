/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { composeChangelog } from './release_changelog.js';

describe('composeChangelog', () => {
  it('writes the first entry on its own', () => {
    expect(composeChangelog('# 0.1.0\n\n### Features\n')).toBe(
      '# 0.1.0\n\n### Features\n'
    );
  });

  it('puts the newest entry above the previous ones', () => {
    expect(composeChangelog('# 0.2.0\n', '# 0.1.0\n')).toBe(
      '# 0.2.0\n\n# 0.1.0\n'
    );
  });

  it('does not accumulate blank lines across releases', () => {
    const first = composeChangelog('# 0.1.0\n');
    const second = composeChangelog('# 0.2.0\n\n\n', first);
    expect(composeChangelog('# 0.3.0\n', second)).toBe(
      '# 0.3.0\n\n# 0.2.0\n\n# 0.1.0\n'
    );
  });
});
