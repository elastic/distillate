/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
