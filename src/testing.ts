/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isCssToken, isScaleToken } from './tokens';

export {
  assertVarRefsHaveDeclarations,
  findVarRefViolations,
  type VarInvariantViolation,
} from './var_invariant';

/**
 * Emits a TypeScript `interface` for a derived token tree, for Monaco extraLib text.
 *
 * @param typeName Interface identifier.
 * @param tree Derived {@link CssToken} / {@link ScaleToken} tree.
 * @param leafType Identifier used for every leaf. Defaults to `CssInterpolable`.
 */
export const tokenTreeDts = (
  typeName: string,
  tree: object,
  leafType = 'CssInterpolable'
): string => `interface ${typeName} ${emitTokenObject(tree, 0, leafType)}`;

const emitTokenObject = (
  value: object,
  indent: number,
  leafType: string
): string => {
  const pad = '  '.repeat(indent);
  const inner = '  '.repeat(indent + 1);
  const lines = Object.entries(value as Record<string, unknown>).map(
    ([key, child]) => {
      if (isCssToken(child) || isScaleToken(child)) {
        return `${inner}readonly ${key}: ${leafType};`;
      }
      if (child && typeof child === 'object') {
        return `${inner}readonly ${key}: ${emitTokenObject(child, indent + 1, leafType)};`;
      }
      throw new Error(`tokenTreeDts: unexpected leaf at "${key}"`);
    }
  );
  return `{\n${lines.join('\n')}\n${pad}}`;
};
