/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createExampleDistillery } from './fixture';

/** Emits the full readable stylesheet for every registered module. */
export const run = (): string => {
  const distillery = createExampleDistillery();
  distillery.createStyleModule('demo', ({ css, tokens }) => ({
    root: css`
      color: ${tokens.colors.ink};
      padding: ${tokens.gap};
    `,
  }));
  return distillery.renderStyles(distillery.stylesheetCollector());
};
