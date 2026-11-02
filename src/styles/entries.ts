/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Declarations, StyleEntry, StyleRule } from './types';

const NO_RULES: readonly StyleRule[] = [];

/** Rules carried by `entry`: none for a handle, itself for a rule, the inner rules for a media block. */
export const rulesOf = (entry: StyleEntry): readonly StyleRule[] => {
  if (entry.kind === 'handle') {
    return NO_RULES;
  }
  return entry.kind === 'rule' ? [entry] : entry.rules;
};

/** Every declaration block `entry` emits. */
export const declarationsOf = (entry: StyleEntry): readonly Declarations[] =>
  entry.kind === 'media'
    ? entry.rules.map((rule) => rule.declarations)
    : [entry.declarations];
