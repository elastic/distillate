/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../instance';

export {
  combineClassNames,
  container,
  css,
  decls,
  globalStylesFromFlattened,
  isVariantMarked,
  media,
  pendingHandleFromFlattened,
  rule,
  variants,
} from './authoring';
export { computeValueDeps, stringifyCssValue } from './declarations';
export { createStyleModuleWithEnvironment } from './module';
export { readableVarOwnersFromEnvironment, StyleRegistry } from './registry';
export type {
  ContextualVarPath,
  CssValue,
  CssVarPath,
  DeclarationSegment,
  Declarations,
  DefaultGroupDeps,
  DefaultKeyDeps,
  LocalVarDefaultMarker,
  LocalVarGroup,
  LocalVarMarker,
  LocalVarOverrideMarker,
  LocalVarRef,
  MutableStyleDeps,
  PendingStyleHandle,
  PrimitiveStyleAuthoringApi,
  ResolvedStyles,
  RuleOptions,
  StyleAuthoringApi,
  StyleDeps,
  StyleEntry,
  StyleHandle,
  StyleMedia,
  StyleRegistrySnapshot,
  StyleRule,
  StylesModule,
  StylesObject,
  StyleSelectorResolver,
} from './types';
