/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *	http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
