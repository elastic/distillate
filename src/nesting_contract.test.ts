/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { compile, type Element } from 'stylis';
import { describe, expect, it } from 'vitest';

/**
 * Pins the stylis 4.4.0 `compile()` tree shape that `nesting.ts` walks.
 * A stylis bump that changes `type`, `props` arity, `@media` children, or
 * DECL `.value` text fails here instead of silently dropping nested rules.
 */
const SELF = '.__dstl_self__';

const childElements = (parent: Element | undefined): Element[] =>
  Array.isArray(parent?.children) ? parent.children : [];

describe('stylis 4.4.0 compile() tree shape', () => {
  it('hoists nested rules to top-level siblings and keeps @media children', () => {
    const tree = compile(
      `${SELF}{color:red;padding:__dstl0__;&:hover, &:focus{color:blue}@media (min-width:600px){color:green;&:hover{padding:1px}}}`
    );

    expect(tree.map((element) => element.type)).toEqual([
      'rule',
      'rule',
      '@media',
    ]);

    const [self, hover, media] = tree;
    expect(self?.props).toEqual([SELF]);
    expect(hover?.props).toEqual([`${SELF}:hover`, `${SELF}:focus`]);
    expect(media?.props).toEqual(['(min-width:600px)']);

    const hoverValue = hover?.value;
    expect(typeof hoverValue).toBe('string');
    expect(hoverValue).toContain('\f');

    const selfDecls = childElements(self).filter(
      (child) => child.type === 'decl'
    );
    expect(selfDecls.map((decl) => decl.value)).toEqual([
      'color:red;',
      'padding:__dstl0__;',
    ]);
    expect(selfDecls[1]?.value).toContain('__dstl0__');

    const mediaChildren = childElements(media);
    expect(mediaChildren.map((child) => child.type)).toEqual(['rule', 'rule']);
    expect(mediaChildren[0]?.props).toEqual([SELF]);
    expect(mediaChildren[1]?.props).toEqual([`${SELF}:hover`]);
  });

  it('exposes a statement-position marker sentinel as a DECL whose props is the custom-property name', () => {
    const tree = compile(`${SELF}{color:red;--dstl-0:0;}`);
    const decls = childElements(tree[0]).filter(
      (child) => child.type === 'decl'
    );
    expect(decls[1]?.props).toBe('--dstl-0');
    expect(decls[1]?.value).toBe('--dstl-0:0;');
  });
});
