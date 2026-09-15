/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// `@rmenke/css-tokenizer-tests` ships no declarations. Only `css` is declared
// here: the corpus also carries reference `tokens`, but this package emits
// spans rather than CSS Syntax tokens, so those are deliberately not consumed.
declare module '@rmenke/css-tokenizer-tests' {
  export const testCorpus: Record<string, { readonly css: string }>;
}
