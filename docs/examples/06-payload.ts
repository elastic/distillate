/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
