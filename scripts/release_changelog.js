/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Prepend one release's notes to the existing changelog. */
export const composeChangelog = (notes, existing = '') => {
  const entry = notes.trim();
  const previous = existing.trim();
  return previous ? `${entry}\n\n${previous}\n` : `${entry}\n`;
};
