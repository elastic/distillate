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

import { variants } from '../../src/index';

import { createExampleDistillery } from './fixture';

export interface VariantExample {
  readonly withoutVariants: string;
  readonly withLoud: string;
}

/** Variant entries stay off always-on collection until a handle is named. */
export const run = (): VariantExample => {
  const distillery = createExampleDistillery();
  const demo = distillery.createStyleModule('toned', ({ css, tokens }) => ({
    root: css`
      color: ${tokens.colors.ink};
    `,
    tone: variants(
      ['calm', 'loud'] as const,
      (tone) => css`
        outline-color: ${tone === 'calm' ? tokens.colors.surface : tokens.colors.accent};
      `
    ),
  }));

  const collector = distillery.artifactCollector('readable');
  collector.use(demo);
  const withoutVariants = distillery.renderStyles(collector);

  collector.useHandles([demo.handles.tone.loud]);
  const withLoud = distillery.renderStyles(collector);

  return { withoutVariants, withLoud };
};
