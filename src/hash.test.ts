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

import { contentHash64 } from './hash';
import { scaleToken, themeToken } from './tokens';

describe('contentHash64', () => {
  it('is deterministic for identical input', () => {
    const a = contentHash64(['color:red;'], []);
    const b = contentHash64(['color:red;'], []);
    expect(a).toBe(b);
  });

  it('produces a fixed-width base36 string', () => {
    expect(contentHash64(['color:red;'], [])).toMatch(/^[0-9a-z]{14}$/);
  });

  it('distinguishes different templates', () => {
    expect(contentHash64(['color:red;'], [])).not.toBe(
      contentHash64(['color:blue;'], [])
    );
  });

  it('folds interpolated values into the hash', () => {
    const withInk = contentHash64(
      ['color:', ';'],
      [themeToken('colors/ink', '--ink')]
    );
    const withAccent = contentHash64(
      ['color:', ';'],
      [themeToken('colors/accent', '--accent')]
    );
    expect(withInk).not.toBe(withAccent);
  });

  it('separates strings from values so shifts do not collide', () => {
    expect(contentHash64(['ab'], [])).not.toBe(contentHash64(['a', ''], ['b']));
  });

  it('rejects unsupported interpolations', () => {
    expect(() => contentHash64(['x:', ';'], [{}])).toThrow(
      /Unsupported interpolation/
    );
  });

  it('tags scale tokens by value', () => {
    const gap = scaleToken('8px', '2cqi');
    expect(contentHash64(['gap:', ';'], [gap])).toBe(
      contentHash64(['gap:', ';'], [scaleToken('8px', 'different-cq')])
    );
  });

  it('has no collisions across a large distinct sample', () => {
    const hashes = new Set<string>();
    for (let i = 0; i < 5000; i += 1) {
      hashes.add(contentHash64([`.c${i}{width:${i}px}`], []));
    }
    expect(hashes.size).toBe(5000);
  });
});
