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

import { extraLibSource, playgroundScopeNames } from './editor_lib';

const isDeclared = (source: string, name: string): boolean =>
  source.includes(`declare function ${name}`) ||
  source.includes(`declare const ${name}`);

describe('extraLibSource', () => {
  it('declares every emotion eval binding and omits native-only names', () => {
    const source = extraLibSource('emotion');
    for (const name of playgroundScopeNames('emotion')) {
      expect(isDeclared(source, name), name).toBe(true);
    }
    expect(source).toContain('readonly primary');
    expect(source).toContain('readonly accent');
    expect(source).toContain('readonly accentSecondary');
    expect(source).toContain('readonly success');
    expect(source).toContain('readonly warning');
    expect(source).toContain('readonly danger');
    expect(source).not.toContain('createStyleModule');
  });

  it('declares every native eval binding and omits emotion-only names', () => {
    const source = extraLibSource('native');
    for (const name of playgroundScopeNames('native')) {
      expect(isDeclared(source, name), name).toBe(true);
    }
    expect(source).toContain('LocalVarGroup');
    expect(source).not.toContain('injectGlobal');
  });
});
