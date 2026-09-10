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

import { assertCssIdentSegment } from './idents';

describe('assertCssIdentSegment', () => {
  it('accepts letter-first segments including hyphens', () => {
    expect(() => assertCssIdentSegment('eui', 'prefix')).not.toThrow();
    expect(() => assertCssIdentSegment('card-header', 'module')).not.toThrow();
    expect(() => assertCssIdentSegment('_private', 'key')).not.toThrow();
  });

  it('rejects empty, slash, space, and digit-first segments', () => {
    expect(() => assertCssIdentSegment('', 'prefix')).toThrow(/prefix/);
    expect(() => assertCssIdentSegment('card/header', 'key')).toThrow(
      /CSS identifier segment/
    );
    expect(() => assertCssIdentSegment('a b', 'key')).toThrow();
    expect(() => assertCssIdentSegment('1card', 'module')).toThrow();
  });
});
