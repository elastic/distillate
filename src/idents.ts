/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Throws if `segment` is not a valid CSS identifier segment.
 *
 * @param segment Value to validate.
 * @param role Human-readable label for the error message (e.g. `'Distillery prefix'`).
 * @throws If `segment` contains characters outside `[A-Za-z_][A-Za-z0-9_-]*`.
 */
export const assertCssIdentSegment = (segment: string, role: string): void => {
  if (!/^[A-Za-z_][A-Za-z0-9_-]*$/.test(segment)) {
    throw new Error(
      `${role} "${segment}" is not a CSS identifier segment. Use a letter or underscore, then letters, digits, hyphens, or underscores.`
    );
  }
};
