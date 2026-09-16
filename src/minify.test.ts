/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { minifyCss } from './minify';

describe('minifyCss', () => {
  it('preserves quoted whitespace', () => {
    expect(minifyCss('.a { content: "a  b"; }')).toBe('.a{content:"a  b"}');
  });

  it('preserves escaped quotes inside strings', () => {
    expect(minifyCss(`.a { content: "a \\" b"; }`)).toBe(
      `.a{content:"a \\" b"}`
    );
  });

  it('removes comments outside strings', () => {
    expect(minifyCss('.a { /* hidden */ color: red; }')).toBe('.a{color:red}');
    expect(minifyCss('.a/* hidden */.b { color: red; }')).toBe(
      '.a.b{color:red}'
    );
    expect(minifyCss('.a { content: "/* visible */"; }')).toBe(
      '.a{content:"/* visible */"}'
    );
  });

  it('keeps a space that separates two values', () => {
    // The mirror of the descendant-combinator case below: this space is not a
    // combinator, but dropping it makes `margin:0auto`, a different and
    // invalid declaration.
    expect(minifyCss('.a { margin: 0 auto; font: bold 12px/1.5 serif; }')).toBe(
      '.a{margin:0 auto;font:bold 12px/1.5 serif}'
    );
  });

  it('keeps descendant-selector spaces', () => {
    expect(minifyCss('.a .b > .c { color: red; }')).toBe('.a .b>.c{color:red}');
  });

  it('strips a comment inside a function that merely ends in `url`', () => {
    // Only a real `url(` token is opaque. `myurl(` is an ordinary function, so
    // what looks like a comment inside it is one, and it goes — taking the
    // slash in front of it, exactly as it would anywhere else.
    expect(minifyCss('.a { background: myurl(/i/*k*/l.svg); }')).toBe(
      '.a{background:myurl(/il.svg)}'
    );
  });

  it('keeps comment-looking characters inside an unquoted url()', () => {
    // `/` and `*` are path characters here, not a comment. The scanner used to
    // eat from the first `/*`, taking the preceding slash with it and emitting
    // `url(/imgicon.svg)`.
    expect(minifyCss('.a { background: url(/img/*dark*/icon.svg); }')).toBe(
      '.a{background:url(/img/*dark*/icon.svg)}'
    );
    expect(minifyCss('.a { background: URL(/a/*b*/c.svg); }')).toBe(
      '.a{background:URL(/a/*b*/c.svg)}'
    );
    // A quoted url still goes through the string branch, and a real comment
    // beside one is still removed.
    expect(
      minifyCss('.a { background: url("/img/*keep*/i.svg"); /* go */ }')
    ).toBe('.a{background:url("/img/*keep*/i.svg")}');
  });

  it('preserves backslash escapes outside strings', () => {
    // The escaped `;` is part of the value. Treating it as a bare `;` let the
    // trailing-semicolon rule drop it, turning the value into `foo\`.
    expect(minifyCss(String.raw`.a { --x: foo\; }`)).toBe(
      String.raw`.a{--x:foo\;}`
    );
    expect(minifyCss(String.raw`.a { --x: a\,b; color: red; }`)).toBe(
      String.raw`.a{--x:a\,b;color:red}`
    );
    expect(minifyCss(String.raw`.b\:hover { color: red; }`)).toBe(
      String.raw`.b\:hover{color:red}`
    );
  });
  it('keeps the descendant space before a pseudo-class', () => {
    // `.menu :hover` and `.menu:hover` target different elements, so the space
    // is significant here even though it is not in `color : red`.
    expect(minifyCss('.menu :hover { color: red; }')).toBe(
      '.menu :hover{color:red}'
    );
    expect(minifyCss('.menu:hover { color : red; }')).toBe(
      '.menu:hover{color:red}'
    );
    expect(minifyCss('.a > :first-child { color: red; }')).toBe(
      '.a>:first-child{color:red}'
    );
  });

  it('tracks selector context through an at-rule block', () => {
    // `@media` opens a block of rules, so the descendant space inside it is
    // still significant, while the declarations one level deeper collapse.
    expect(
      minifyCss('@media (min-width:0) { .a :hover { color: red; } }')
    ).toBe('@media (min-width:0){.a :hover{color:red}}');
  });
  it('leaves one space where a comment sat between two', () => {
    // Dropping the comment leaves two whitespace runs adjacent; emitting one
    // space per run would keep both and the output would not be minimal.
    expect(minifyCss('.a /*c*/ .b { color: red; }')).toBe('.a .b{color:red}');
    expect(minifyCss('.a  /*c*/  .b { color: red; }')).toBe('.a .b{color:red}');
    expect(minifyCss('.a /*c*/.b { color: red; }')).toBe('.a .b{color:red}');
  });
});
