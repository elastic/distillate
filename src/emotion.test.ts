/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { createEmotion, type StyleSink } from './emotion';
import { createDistillery } from './engine';
import type { LocalVarGroup, StyleHandle } from './styles';
import { lightDark } from './tokens';
import { cq } from './tokens';

const fixtureTheme = {
  colors: {
    ink: lightDark('#111', '#eee'),
    accent: lightDark('#06c', '#8cf'),
  },
  gap: cq('8px', '2cqi'),
};

const createFixtureDistillery = () =>
  createDistillery({
    prefix: 'eui',
    themeScope: '.eui-view',
    theme: fixtureTheme,
  });

const collectClassName = (
  distillery: ReturnType<typeof createFixtureDistillery>,
  handle: StyleHandle
): { className: string; css: string } => {
  const collector = distillery.artifactCollector('compact');
  collector.useHandles([handle]);
  const resolver = collector.createResolver();
  return {
    className: resolver.className(handle.key, handle.readableName),
    css: distillery.renderStyles(collector, resolver),
  };
};

describe('createEmotion — css wrapper', () => {
  it('stringifies to a readable class name without collecting', () => {
    const distillery = createFixtureDistillery();
    const em = createEmotion(distillery);
    const box = em.css`color: red;`;
    expect(String(box)).toMatch(/^css-[0-9a-z]{14}-root$/);
    // Stringification alone collects nothing.
    expect(
      distillery.renderStyles(distillery.artifactCollector('readable'))
    ).toBe('');
  });

  it('collects and compacts through resolveClassName (contract 2)', () => {
    const distillery = createFixtureDistillery();
    const em = createEmotion(distillery);
    const box = em.css`
      color: ${distillery.tokens.colors.ink};
    `;
    const { className, css } = collectClassName(distillery, box);
    expect(className).toBe('a');
    expect(css).toContain('.a{color:var(--a)}');
  });

  it('dedupes identical templates across instances by identity', () => {
    const distillery = createFixtureDistillery();
    const em1 = createEmotion(distillery);
    const em2 = createEmotion(distillery);
    const a = em1.css`color: red;`;
    const b = em2.css`color: red;`;
    expect(a).toBe(b);
    expect(String(a)).toBe(String(b));
  });

  it('does not dedupe local var defaults with different values', () => {
    const distillery = createFixtureDistillery();
    let redLook: LocalVarGroup<'bg'> | undefined;
    let blueLook: LocalVarGroup<'bg'> | undefined;
    distillery.createStyleModule('vars', (t) => {
      redLook = t.vars('look', { bg: 'red' });
      blueLook = t.vars('look', { bg: 'blue' });
      return { carrier: t.css`` };
    });
    if (!redLook || !blueLook) {
      throw new Error('expected local var groups');
    }

    const em = createEmotion(distillery);
    const red = em.css`
      ${redLook}
      color: ${redLook.bg};
    `;
    const blue = em.css`
      ${blueLook}
      color: ${blueLook.bg};
    `;

    expect(red).not.toBe(blue);
    expect(em.stylesheet()).toContain(
      `.${String(red)}{--eui-vars-look-bg:red;color:var(--eui-vars-look-bg)}`
    );
    expect(em.stylesheet()).toContain(
      `.${String(blue)}{--eui-vars-look-bg:blue;color:var(--eui-vars-look-bg)}`
    );
  });

  it('renders nested selectors and media authored in one template', () => {
    const distillery = createFixtureDistillery();
    const em = createEmotion(distillery);
    const box = em.css`
      color: ${distillery.tokens.colors.ink};
      &:hover {
        color: ${distillery.tokens.colors.accent};
      }
      @media (min-width: 600px) {
        padding: ${distillery.tokens.gap};
      }
    `;
    const readable = String(box).replace(/-root$/, '');
    const sheet = em.stylesheet();
    expect(sheet).toContain(
      `.${readable}-root:hover{color:var(--eui-colors-accent)}`
    );
    expect(sheet).toContain('@media (min-width:600px)');
  });
});

describe('createEmotion — composition', () => {
  it('splices composed declarations in source order (last wins)', () => {
    const distillery = createFixtureDistillery();
    const em = createEmotion(distillery);
    const base = em.css`
      color: red;
    `;
    const ext = em.css`
      ${base}
      color: blue;
    `;
    const { css } = collectClassName(distillery, ext);
    // Both declarations land on one class; the later `blue` wins at cascade.
    expect(css).toContain('color:red');
    expect(css).toContain('color:blue');
    expect(css.indexOf('color:red')).toBeLessThan(css.indexOf('color:blue'));
  });

  it('re-targets composed nested blocks to the composing class', () => {
    const distillery = createFixtureDistillery();
    const em = createEmotion(distillery);
    const hover = em.css`
      &:hover {
        color: blue;
      }
    `;
    const ext = em.css`
      ${hover}
      color: red;
    `;
    const collector = distillery.artifactCollector('readable');
    collector.useHandles([ext]);
    const css = distillery.renderStyles(collector);
    const readable = String(ext);
    expect(css).toContain(`.${readable}:hover{color:blue}`);
  });

  it('keeps a compat handle in selector position as a cross-class target', () => {
    const distillery = createFixtureDistillery();
    const em = createEmotion(distillery);
    const target = em.css`color: red;`;
    const container = em.css`
      ${target} & {
        outline: 1px solid black;
      }
    `;
    const collector = distillery.artifactCollector('readable');
    collector.useHandles([target, container]);
    const css = distillery.renderStyles(collector);
    expect(css).toContain(
      `.${String(target)} .${String(container)}{outline:1px solid black}`
    );
  });
});

describe('createEmotion — cx', () => {
  const em = createEmotion(createFixtureDistillery());

  it('handles strings, numbers, falsy, arrays, and object maps', () => {
    expect(em.cx('a', 'b')).toBe('a b');
    expect(em.cx('a', false, null, undefined, 'c')).toBe('a c');
    expect(em.cx(['a', ['b', 'c']])).toBe('a b c');
    expect(em.cx({ a: true, b: false, c: true })).toBe('a c');
  });

  it('stringifies compat handles', () => {
    const w = em.css`color: red;`;
    expect(em.cx('x', w)).toBe(`x ${String(w)}`);
  });

  it('stringifies native style handles by readableName', () => {
    const distillery = createFixtureDistillery();
    const demo = distillery.createStyleModule('box', (t) => ({
      root: t.css`
        color: ${t.tokens.colors.ink};
      `,
    }));
    const em = createEmotion(distillery);
    expect(em.cx('x', demo.handles.root)).toBe('x box-root');
  });
});

describe('createEmotion — injectGlobal', () => {
  it('ships in the stylesheet but not artifacts unless opted in', () => {
    const distillery = createFixtureDistillery();
    const em = createEmotion(distillery);
    expect(
      () =>
        em.injectGlobal`
        body {
          margin: 0;
        }
      `
    ).not.toThrow();

    expect(em.stylesheet()).toContain('body{margin:0}');

    const collector = distillery.artifactCollector('readable');
    expect(distillery.renderStyles(collector)).not.toContain('margin:0');

    for (const module of em.globalModules()) {
      collector.use(module);
    }
    expect(distillery.renderStyles(collector)).toContain('body{margin:0}');
  });

  it('dedupes repeated global registrations', () => {
    const distillery = createFixtureDistillery();
    const em = createEmotion(distillery);
    const inject = (): void => em.injectGlobal`body { margin: 0; }`;
    inject();
    inject();
    expect(em.globalModules()).toHaveLength(1);
  });
});

describe('createEmotion — errors and equivalence', () => {
  it('rejects object styles', () => {
    const em = createEmotion(createFixtureDistillery());
    const objectStyles = { color: 'red' } as unknown as TemplateStringsArray;
    expect(() => em.css(objectStyles)).toThrow(/object styles/);
  });

  it('rejects unsupported at-rules', () => {
    const em = createEmotion(createFixtureDistillery());
    expect(() => em.injectGlobal`@keyframes spin { from {} to {} }`).toThrow(
      /@media/
    );
  });

  it('stylesheet() equals a readable stylesheet render', () => {
    const distillery = createFixtureDistillery();
    const em = createEmotion(distillery);
    const registered = em.css`color: red;`;
    expect(String(registered)).toContain('css-');
    expect(em.stylesheet()).toBe(
      distillery.renderStyles(distillery.stylesheetCollector('readable'))
    );
  });
});

describe('createEmotion — sinks', () => {
  const recordingSink = (): { sink: StyleSink; renders: string[] } => {
    const renders: string[] = [];
    return {
      sink: { invalidate: (render) => renders.push(render()) },
      renders,
    };
  };

  it('catches a late-attached sink up to already-registered styles', () => {
    const distillery = createFixtureDistillery();
    const em = createEmotion(distillery);
    const box = em.css`color: red;`;
    const readable = String(box);

    const { sink, renders } = recordingSink();
    createEmotion(distillery, { sink });

    expect(renders).toHaveLength(1);
    expect(renders[0]).toContain(`.${readable}`);
    expect(renders[0]).toContain('color:red');
  });

  it('invalidates an attached sink on subsequent uncached registration', () => {
    const distillery = createFixtureDistillery();
    const { sink, renders } = recordingSink();
    const em = createEmotion(distillery, { sink });

    // One invalidation from attachment (empty stylesheet).
    expect(renders).toHaveLength(1);
    const added = em.css`color: blue;`;
    expect(String(added)).toContain('css-');
    expect(renders).toHaveLength(2);
    expect(renders[1]).toContain('color:blue');
  });
});
