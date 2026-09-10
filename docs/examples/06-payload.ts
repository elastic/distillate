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

export interface PayloadExample {
  readonly stylesheet: string;
  readonly artifact: string;
  readonly stylesheetBytes: number;
  readonly artifactBytes: number;
}

const utf8Bytes = (css: string): number =>
  new TextEncoder().encode(css).byteLength;

/** Full readable stylesheet versus a compact artifact from one named render. */
export const run = (): PayloadExample => {
  const distillery = createExampleDistillery();
  const panel = distillery.createStyleModule(
    'panel',
    ({ css, tokens, vars }) => {
      const look = vars('look', {
        bg: tokens.colors.surface,
        fg: tokens.colors.ink,
        ring: tokens.colors.accent,
      });
      return {
        root: css`
          ${look}
          display: grid;
          gap: ${tokens.gap};
          padding: ${tokens.gap};
          background: ${look.bg};
          color: ${look.fg};
        `,
        title: css`
          margin: 0;
          color: ${tokens.colors.accent};
        `,
        tone: variants(['calm', 'loud', 'danger'] as const, (tone) => {
          if (tone === 'calm') {
            return css`
              outline-color: ${tokens.colors.surface};
            `;
          }
          if (tone === 'loud') {
            return css`
              ${look}
              outline-color: ${look.ring};
              outline-width: ${tokens.gap};
            `;
          }
          return css`
            outline-color: ${tokens.colors.ink};
            background: ${tokens.colors.accent};
            color: ${tokens.colors.surface};
          `;
        }),
        footer: css`
          color: ${tokens.colors.accent};
          padding: ${tokens.gap};
          border-color: ${tokens.colors.ink};
        `,
      };
    }
  );

  const stylesheet = distillery.renderStyles(distillery.stylesheetCollector());
  const collector = distillery.artifactCollector('compact');
  collector.useHandles([panel.handles.root, panel.handles.tone.calm]);
  const artifact = distillery.renderStyles(collector);

  return {
    stylesheet,
    artifact,
    stylesheetBytes: utf8Bytes(stylesheet),
    artifactBytes: utf8Bytes(artifact),
  };
};
