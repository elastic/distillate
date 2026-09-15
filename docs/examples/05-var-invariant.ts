/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  assertVarRefsHaveDeclarations,
  findVarRefViolations,
} from '../../src/testing';

import { createExampleDistillery } from './fixture';

export interface VarInvariantExample {
  readonly css: string;
  readonly violationCount: number;
}

/** Checks that every `var(...)` in emitted CSS has a matching declaration. */
export const run = (): VarInvariantExample => {
  const distillery = createExampleDistillery();
  distillery.createStyleModule('demo', ({ css, tokens }) => ({
    root: css`
      color: ${tokens.colors.ink};
    `,
  }));
  const css = distillery.renderStyles(distillery.stylesheetCollector());
  assertVarRefsHaveDeclarations(css);
  return { css, violationCount: findVarRefViolations(css).length };
};
