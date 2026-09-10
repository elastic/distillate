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

export { createDistillery, type Distillery } from './engine';
export {
  type DistilleryEnvironment,
  type DistilleryOptions,
  type ThemeVarDefinition,
} from './environment';
export {
  zipSchemes,
  type DeepPartialTheme,
  type MediaThemeDeclaration,
  type PathsOf,
  type ResolvedThemeLayer,
  type SchemeValueTree,
  type ThemeDeclaration,
  type ThemeTree,
  type TokensOf,
  type Zipped,
} from './theme';
export {
  contextualVar,
  cq,
  isContextualCssVar,
  isContextualCssVarName,
  isCssToken,
  isScaleToken,
  lightDark,
  scaleToken,
  themeToken,
  type ContextualCssVar,
  type ContextualCssVarName,
  type CssToken,
  type ScaleToken,
  type SchemePair,
} from './tokens';
export {
  createStyleNameResolver,
  cssVarName,
  type StyleNameMode,
  type StyleNameResolver,
  type StyleNameResolverOptions,
  type StyleTarget,
} from './names';
export { StylesCollector, type StylesCollectorOptions } from './collector';
export {
  renderStyles,
  type RenderStylesOptions,
  type ThemeAlternate,
} from './runtime';
export {
  combineClassNames,
  container,
  css,
  decls,
  media,
  rule,
  StyleRegistry,
  variants,
  type ContextualVarPath,
  type CssValue,
  type CssVarPath,
  type Declarations,
  type DeclarationSegment,
  type DefaultGroupDeps,
  type DefaultKeyDeps,
  type LocalVarDefaultMarker,
  type LocalVarGroup,
  type LocalVarMarker,
  type LocalVarOverrideMarker,
  type LocalVarRef,
  type PrimitiveStyleAuthoringApi,
  type ResolvedStyles,
  type RuleOptions,
  type StyleAuthoringApi,
  type StyleDeps,
  type StyleEntry,
  type StyleHandle,
  type StyleMedia,
  type StyleRegistrySnapshot,
  type StyleRule,
  type StylesModule,
  type StylesObject,
  type StyleSelectorResolver,
} from './styles';
