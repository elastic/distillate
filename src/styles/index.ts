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
