/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
