/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { snippetById, snippetCatalog, snippets } from './snippets';

describe('snippet catalog', () => {
  it('lists the same ids and labels in both modes', () => {
    const meta = (mode: 'emotion' | 'native') =>
      snippets[mode].map(({ id, label }) => ({ id, label }));
    expect(meta('emotion')).toEqual(meta('native'));
    expect(snippets.emotion.map(({ id }) => id)).toEqual(
      snippetCatalog.map(({ id }) => id)
    );
  });

  it('loads both authoring modes from one snippet id', () => {
    const bundle = snippetById('tree-shake');
    expect(bundle?.id).toBe('tree-shake');
    expect(bundle?.source.emotion).toContain('css`');
    expect(bundle?.source.native).toContain('createStyleModule');
  });
});
