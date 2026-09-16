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

import { describe, expect, it } from 'vitest';

import { createDistillery } from './engine';
import { container, media, rule, variants } from './styles';
import { lightDark } from './tokens';
import { contextualVar, cq } from './tokens';

// Fixture environment deliberately styled after a foreign component library
// (`eui`, not `aui`) to prove the engine carries no brand assumptions.
const fixtureTheme = {
  colors: {
    ink: lightDark('#111', '#eee'),
    accent: lightDark('#06c', '#8cf'),
    surface: lightDark('#fff', '#000'),
  },
  gap: cq('8px', '2cqi'),
};

const createFixtureDistillery = () =>
  createDistillery({
    prefix: 'eui',
    themeScope: '.eui-view',
    theme: fixtureTheme,
  });

describe('createDistillery with a foreign environment', () => {
  it('tree-shakes artifact CSS and scopes theme vars to the environment', () => {
    const distillery = createFixtureDistillery();
    const demo = distillery.createStyleModule('demo', (t) => ({
      root: t.css`
        color: ${t.tokens.colors.ink};
      `,
      accent: t.css`
        color: ${t.tokens.colors.accent};
      `,
    }));

    const collector = distillery.artifactCollector('compact');
    collector.use(demo.handles.root);
    const resolver = collector.createResolver();

    expect(resolver.className(demo.handles.root.key)).toBe('a');
    expect(distillery.renderStyles(collector, resolver)).toBe(
      '.eui-view{--a:light-dark(#111,#eee)}.a{color:var(--a)}'
    );
  });

  it('emits readable output using the environment prefix and scope', () => {
    const distillery = createFixtureDistillery();
    distillery.createStyleModule('panel', (t) => ({
      root: t.css`
        padding: ${t.tokens.gap};
        background: ${t.tokens.colors.surface};
      `,
    }));

    const css = distillery.renderStyles(distillery.stylesheetCollector());

    expect(css).toContain(
      '.eui-view{--eui-colors-surface:light-dark(#fff,#000)}'
    );
    expect(css).toContain(
      '.panel-root{padding:8px;background:var(--eui-colors-surface)}'
    );
    expect(css).not.toContain('aui');
  });

  it('keeps custom-property names literal inside strings and URLs', () => {
    const distillery = createFixtureDistillery();
    const demo = distillery.createStyleModule('literal', (t) => ({
      root: t.css`
        content: "--eui-colors-ink";
        background-image: url(/--eui-colors-ink.svg);
        color: ${t.tokens.colors.ink};
      `,
      label: t.css`
        content: "--eui-colors-ink";
      `,
    }));

    const withThemeDep = distillery.artifactCollector('compact');
    withThemeDep.useHandles([demo.handles.root]);
    expect(distillery.renderStyles(withThemeDep)).toBe(
      '.eui-view{--a:light-dark(#111,#eee)}.a{content:"--eui-colors-ink";background-image:url(/--eui-colors-ink.svg);color:var(--a)}'
    );

    const withoutThemeDep = distillery.artifactCollector('compact');
    withoutThemeDep.useHandles([demo.handles.label]);
    expect(distillery.renderStyles(withoutThemeDep)).toBe(
      '.a{content:"--eui-colors-ink"}'
    );
  });

  it('emits a theme declaration for a useThemeVar-only path', () => {
    const distillery = createFixtureDistillery();
    const collector = distillery.artifactCollector('readable');
    collector.useThemeVar('colors/ink');

    expect(distillery.renderStyles(collector)).toBe(
      '.eui-view{--eui-colors-ink:light-dark(#111,#eee)}'
    );
  });

  it('emits a theme declaration for a token referenced only outside collected CSS', () => {
    const distillery = createFixtureDistillery();
    const demo = distillery.createStyleModule('panel', (t) => ({
      root: t.css`
        padding: ${t.tokens.gap};
      `,
    }));
    const collector = distillery.artifactCollector('readable');
    collector.use(demo.handles.root);
    collector.useThemeVar('colors/ink');

    expect(distillery.renderStyles(collector)).toBe(
      '.eui-view{--eui-colors-ink:light-dark(#111,#eee)}.panel-root{padding:8px}'
    );
  });

  it('emits a themeValueOverrides value for an otherwise-unreferenced path', () => {
    const distillery = createFixtureDistillery();
    const collector = distillery.artifactCollector('readable');
    collector.useThemeVar('colors/ink');

    expect(
      distillery.renderStyles(collector, undefined, {
        themeValueOverrides: { 'colors/ink': '#000' },
      })
    ).toBe('.eui-view{--eui-colors-ink:#000}');
  });

  it('merges later themeValueOverrides over earlier ones', () => {
    const distillery = createFixtureDistillery();
    const collector = distillery.artifactCollector('readable');
    collector.useThemeVar('colors/accent');
    collector.useThemeVar('colors/ink');
    const profile = {
      'colors/ink': '#111',
      'colors/accent': '#06c',
    };
    const palette = { 'colors/ink': '#000' };

    expect(
      distillery.renderStyles(collector, undefined, {
        themeValueOverrides: { ...profile, ...palette },
      })
    ).toBe('.eui-view{--eui-colors-accent:#06c;--eui-colors-ink:#000}');
  });

  it('auto-collects rules whose selector dependencies are all collected', () => {
    const distillery = createFixtureDistillery();
    const demo = distillery.createStyleModule('hoverable', (t) => ({
      button: t.css`
        color: ${t.tokens.colors.ink};
      `,
      other: t.css`
        color: ${t.tokens.colors.accent};
      `,
      hover: rule(
        (h) => `${h.button}:hover`,
        t.decls`
          color: ${t.tokens.colors.accent};
        `
      ),
      pairOnly: rule(
        (h) => `${h.button} + ${h.other}`,
        t.decls`
          margin-left: ${t.tokens.gap};
        `
      ),
    }));

    const collector = distillery.artifactCollector('readable');
    collector.useHandles([demo.handles.button]);
    const css = distillery.renderStyles(collector);

    expect(css).toContain('.hoverable-button:hover');
    // Strict-deps semantics: `pairOnly` also reads `other`, which was never
    // collected, so the rule must stay out of the emitted CSS.
    expect(css).not.toContain('+');
  });

  it('keeps variant entries out of always-on collection but reachable explicitly', () => {
    const distillery = createFixtureDistillery();
    const demo = distillery.createStyleModule('toned', (t) => ({
      root: t.css`
        color: ${t.tokens.colors.ink};
      `,
      tone: variants(
        ['calm', 'loud'] as const,
        (tone) =>
          t.css`
          outline-color: ${tone === 'calm' ? t.tokens.colors.surface : t.tokens.colors.accent};
        `
      ),
    }));

    const collector = distillery.artifactCollector('readable');
    collector.use(demo);
    const withoutVariants = distillery.renderStyles(collector);
    expect(withoutVariants).not.toContain('toned-tone');

    collector.useHandles([demo.handles.tone.loud]);
    const withVariant = distillery.renderStyles(collector);
    expect(withVariant).toContain('.toned-tone-loud');
    expect(withVariant).not.toContain('toned-tone-calm');
  });

  it('includes only the live rules of a partially-collected media block', () => {
    const distillery = createFixtureDistillery();
    const demo = distillery.createStyleModule('responsive', (t) => ({
      first: t.css`
        color: ${t.tokens.colors.ink};
      `,
      second: t.css`
        color: ${t.tokens.colors.accent};
      `,
      compact: media('(max-width: 400px)', [
        rule(
          (h) => `${h.first}`,
          t.decls`
            display: none;
          `
        ),
        rule(
          (h) => `${h.second}`,
          t.decls`
            display: block;
          `
        ),
      ]),
    }));

    const collector = distillery.artifactCollector('readable');
    collector.useHandles([demo.handles.first]);
    const css = distillery.renderStyles(collector);

    expect(css).toContain(
      '@media (max-width:400px){.responsive-first{display:none}}'
    );
    expect(css).not.toContain('responsive-second');
  });

  it('keeps manually collected media rules inside their at-rule', () => {
    const distillery = createFixtureDistillery();
    const demo = distillery.createStyleModule('manualResponsive', (t) => ({
      root: t.css`
        color: red;
      `,
      compact: media('(max-width: 400px)', [
        rule(
          (h) => `${h.root}`,
          t.decls`
            color: blue;
          `
        ),
      ]),
    }));

    const collector = distillery.artifactCollector('readable');
    collector.use(demo.handles.root);
    collector.use(demo.handles.compact);

    expect(distillery.renderStyles(collector)).toBe(
      '.manualResponsive-root{color:red}@media (max-width:400px){.manualResponsive-root{color:blue}}'
    );
  });

  it('names module-local var groups with the environment prefix and prunes unreachable defaults', () => {
    const distillery = createFixtureDistillery();
    const demo = distillery.createStyleModule('chip', (t) => {
      const vars = t.vars('look', {
        bg: t.tokens.colors.surface,
        unusedBorder: t.tokens.colors.accent,
      });
      return {
        root: t.css`
          ${vars}
          background: ${vars.bg};
        `,
        loud: t.css`
          ${vars.set({ bg: t.tokens.colors.accent })}
        `,
      };
    });

    const collector = distillery.artifactCollector('readable');
    collector.useHandles([demo.handles.root, demo.handles.loud]);
    const css = distillery.renderStyles(collector);

    expect(css).toContain('--eui-chip-look-bg:var(--eui-colors-surface)');
    expect(css).toContain('background:var(--eui-chip-look-bg)');
    // `unusedBorder` is declared but never referenced, so its default (and
    // its theme dep) must be pruned from the payload.
    expect(css).not.toContain('unusedBorder');
    expect(css).not.toContain('aui');
  });

  // Regression for finding `local-var-override-ordering`.
  it('emits t.vars defaults before .set() overrides when the override handle sorts first', () => {
    const distillery = createFixtureDistillery();
    const demo = distillery.createStyleModule('chip', (t) => {
      const look = t.vars('look', { bg: t.tokens.colors.surface });
      return {
        root: t.css`
          ${look}
          background: ${look.bg};
        `,
        accent: t.css`
          ${look.set({ bg: t.tokens.colors.accent })}
        `,
      };
    });

    const collector = distillery.artifactCollector('readable');
    collector.useHandles([demo.handles.root, demo.handles.accent]);
    const css = distillery.renderStyles(collector);
    const defaults = '--eui-chip-look-bg:var(--eui-colors-surface)';
    const override = '--eui-chip-look-bg:var(--eui-colors-accent)';
    expect(css.indexOf(defaults)).toBeGreaterThan(-1);
    expect(css.indexOf(override)).toBeGreaterThan(-1);
    expect(css.indexOf(defaults)).toBeLessThan(css.indexOf(override));
  });
});

describe('nested Emotion-style css templates', () => {
  it('renders nested selectors and media in the stylesheet target', () => {
    const distillery = createFixtureDistillery();
    distillery.createStyleModule('card', (t) => ({
      root: t.css`
        color: ${t.tokens.colors.ink};
        &:hover {
          color: ${t.tokens.colors.accent};
        }
        @media (min-width: 600px) {
          padding: ${t.tokens.gap};
        }
      `,
    }));

    const css = distillery.renderStyles(distillery.stylesheetCollector());

    expect(css).toContain('.card-root{color:var(--eui-colors-ink)}');
    expect(css).toContain('.card-root:hover{color:var(--eui-colors-accent)}');
    expect(css).toContain('@media (min-width:600px){.card-root{padding:8px}}');
  });

  it('renders base rules before media blocks', () => {
    const distillery = createFixtureDistillery();
    distillery.createStyleModule('deck', (t) => ({
      root: t.css`
        color: ${t.tokens.colors.ink};
        @media (min-width: 600px) {
          color: ${t.tokens.colors.accent};
        }
        &:hover {
          color: ${t.tokens.colors.surface};
        }
      `,
    }));

    const css = distillery.renderStyles(distillery.stylesheetCollector());
    expect(css.indexOf('.deck-root{')).toBeLessThan(css.indexOf(':hover'));
    expect(css.indexOf(':hover')).toBeLessThan(css.indexOf('@media'));
  });

  // Regression for finding `media-block-ordering`. A module whose name sorts
  // after `media` (which `deck` deliberately does not) used to emit its
  // `@media` overrides before the base rules they override, so at equal
  // specificity the base rule won and the responsive override never applied.
  // `row` and `table` in the official pack are the real cases; this mirrors
  // their explicit `media(...)`/`rule(...)` shape.
  it('emits base rules before an overriding media block when the module name sorts after `media`', () => {
    const distillery = createFixtureDistillery();
    distillery.createStyleModule('zebra', (t) => ({
      root: t.css`
        grid-template-columns: repeat(4, 1fr);
      `,
      responsive: media('(max-width: 620px)', [
        rule(
          (selectors) => `${selectors.root}`,
          t.decls`
            grid-template-columns: 1fr;
          `
        ),
      ]),
    }));

    const css = distillery.renderStyles(distillery.stylesheetCollector());
    const baseIndex = css.indexOf(
      '.zebra-root{grid-template-columns:repeat(4,1fr)}'
    );
    const mediaIndex = css.indexOf('@media (max-width:620px)');
    expect(baseIndex).toBeGreaterThanOrEqual(0);
    expect(mediaIndex).toBeGreaterThanOrEqual(0);
    expect(baseIndex).toBeLessThan(mediaIndex);
  });

  // Regression for cross-module media ordering. When module `alpha` has a
  // `@media` block whose selector references a handle from module `zebra`,
  // `alpha` sorts before `zebra` alphabetically. Per-module media ranking
  // emitted `alpha`'s media before `zebra`'s base declaration, so at equal
  // specificity the base rule won and the responsive override never applied.
  // Global media ranking (all non-media before all media) fixes this.
  it('emits cross-module base rules before an overriding media block in an earlier-sorting module', () => {
    const distillery = createFixtureDistillery();
    const zebra = distillery.createStyleModule('zebra', (t) => ({
      root: t.css`
        color: ${t.tokens.colors.ink};
      `,
    }));
    distillery.createStyleModule('alpha', (t) => ({
      responsive: media('(max-width: 620px)', [
        rule(
          // A foreign handle resolves through the call form, which returns the
          // bare class name. The property form is only defined for the rule's
          // own module's handles, and `alpha` has none — it exists purely to
          // own a media block that overrides another module's rule.
          (selectors) => `.${selectors(zebra.handles.root)}`,
          t.decls`
            color: ${t.tokens.colors.accent};
          `
        ),
      ]),
    }));

    const css = distillery.renderStyles(distillery.stylesheetCollector());
    const baseIndex = css.indexOf('.zebra-root{color:var(--eui-colors-ink)}');
    const mediaIndex = css.indexOf('@media (max-width:620px)');
    expect(baseIndex).toBeGreaterThanOrEqual(0);
    expect(mediaIndex).toBeGreaterThanOrEqual(0);
    expect(baseIndex).toBeLessThan(mediaIndex);
    // Both sides must resolve to the same single-class selector, or the
    // ordering assertion above proves nothing: `@media` adds no specificity, so
    // source order is the only thing deciding which of these two wins.
    expect(css).toContain(
      '@media (max-width:620px){.zebra-root{color:var(--eui-colors-accent)}}'
    );
  });

  it('emits a `container(...)` entry with an `@container` prelude', () => {
    const distillery = createFixtureDistillery();
    distillery.createStyleModule('band', (t) => ({
      root: t.css`
        display: flex;
      `,
      wide: container('(min-width: 1080px)', [
        rule(
          (selectors) => `${selectors.root}`,
          t.decls`
            display: grid;
          `
        ),
      ]),
    }));

    const css = distillery.renderStyles(distillery.stylesheetCollector());
    expect(css).toContain(
      '@container (min-width:1080px){.band-root{display:grid}}'
    );
    expect(css).not.toContain('@media (min-width:1080px)');
  });

  // `container(...)` keeps `kind: 'media'` precisely so it inherits the
  // emission rank from finding `media-block-ordering`: `@container` adds no
  // specificity either, so a same-selector override only wins by coming later
  // in source. Mirrors the `zebra` media case above with a module name that
  // sorts after `container`.
  it('emits base rules before an overriding container block when the module name sorts after `container`', () => {
    const distillery = createFixtureDistillery();
    distillery.createStyleModule('zebra', (t) => ({
      root: t.css`
        grid-template-columns: repeat(4, 1fr);
      `,
      responsive: container('(min-width: 620px)', [
        rule(
          (selectors) => `${selectors.root}`,
          t.decls`
            grid-template-columns: 1fr;
          `
        ),
      ]),
    }));

    const css = distillery.renderStyles(distillery.stylesheetCollector());
    const baseIndex = css.indexOf(
      '.zebra-root{grid-template-columns:repeat(4,1fr)}'
    );
    const containerIndex = css.indexOf('@container (min-width:620px)');
    expect(baseIndex).toBeGreaterThanOrEqual(0);
    expect(containerIndex).toBeGreaterThanOrEqual(0);
    expect(baseIndex).toBeLessThan(containerIndex);
  });

  // `entryKey` is `media/${moduleName}/${authored path}`, so identical query
  // strings on a `media(...)` and a `container(...)` cannot collide in the
  // collector's dedupe map. Both must survive collection and emit separately.
  it('keeps a media and a container block with the same query as distinct entries', () => {
    const distillery = createFixtureDistillery();
    distillery.createStyleModule('twin', (t) => ({
      root: t.css`
        display: flex;
      `,
      viewport: media('(min-width: 640px)', [
        rule(
          (selectors) => `${selectors.root}`,
          t.decls`
            color: ${t.tokens.colors.ink};
          `
        ),
      ]),
      inline: container('(min-width: 640px)', [
        rule(
          (selectors) => `${selectors.root}`,
          t.decls`
            color: ${t.tokens.colors.accent};
          `
        ),
      ]),
    }));

    const css = distillery.renderStyles(distillery.stylesheetCollector());
    expect(css).toContain(
      '@media (min-width:640px){.twin-root{color:var(--eui-colors-ink)}}'
    );
    expect(css).toContain(
      '@container (min-width:640px){.twin-root{color:var(--eui-colors-accent)}}'
    );
  });

  it('tree-shakes an uncollected handle and its nested block from artifacts', () => {
    const distillery = createFixtureDistillery();
    const demo = distillery.createStyleModule('shake', (t) => ({
      kept: t.css`
        color: ${t.tokens.colors.ink};
        &:hover {
          color: ${t.tokens.colors.accent};
        }
      `,
      dropped: t.css`
        color: ${t.tokens.colors.surface};
        &:hover {
          outline: 1px solid ${t.tokens.colors.surface};
        }
      `,
    }));

    const collector = distillery.artifactCollector('readable');
    collector.useHandles([demo.handles.kept]);
    const css = distillery.renderStyles(collector);

    expect(css).toContain('.shake-kept:hover{color:var(--eui-colors-accent)}');
    expect(css).not.toContain('shake-dropped');
    expect(css).not.toContain('surface');
  });

  it('auto-collects a nested rule only when its self handle is collected', () => {
    const distillery = createFixtureDistillery();
    const demo = distillery.createStyleModule('reach', (t) => ({
      button: t.css`
        color: ${t.tokens.colors.ink};
        &:hover {
          color: ${t.tokens.colors.accent};
        }
      `,
      other: t.css`
        color: ${t.tokens.colors.surface};
      `,
    }));

    const collector = distillery.artifactCollector('readable');
    collector.useHandles([demo.handles.other]);
    expect(distillery.renderStyles(collector)).not.toContain(':hover');

    collector.useHandles([demo.handles.button]);
    expect(distillery.renderStyles(collector)).toContain('.reach-button:hover');
  });

  it('captures cross-module handles in selector position with strict deps', () => {
    const distillery = createFixtureDistillery();
    const base = distillery.createStyleModule('base', (t) => ({
      mark: t.css`
        color: ${t.tokens.colors.ink};
      `,
    }));
    const overlay = distillery.createStyleModule('overlay', (t) => ({
      panel: t.css`
        color: ${t.tokens.colors.surface};
        ${base.handles.mark} & {
          outline: 1px solid ${t.tokens.colors.accent};
        }
      `,
    }));

    const partial = distillery.artifactCollector('readable');
    partial.useHandles([overlay.handles.panel]);
    expect(distillery.renderStyles(partial)).not.toContain('outline');

    const full = distillery.artifactCollector('readable');
    full.useHandles([base.handles.mark, overlay.handles.panel]);
    expect(distillery.renderStyles(full)).toContain(
      '.base-mark .overlay-panel{outline:1px solid var(--eui-colors-accent)}'
    );
  });

  it('stamps variant nested entries and keeps them off always-on collection', () => {
    const distillery = createFixtureDistillery();
    const demo = distillery.createStyleModule('toned', (t) => ({
      tone: variants(
        ['loud'] as const,
        () => t.css`
        color: ${t.tokens.colors.ink};
        &:hover {
          color: ${t.tokens.colors.accent};
        }
      `
      ),
    }));

    const collector = distillery.artifactCollector('readable');
    collector.use(demo);
    expect(distillery.renderStyles(collector)).not.toContain('toned-tone');

    collector.useHandles([demo.handles.tone.loud]);
    expect(distillery.renderStyles(collector)).toContain(
      '.toned-tone-loud:hover'
    );
  });

  it('keeps brace-free templates on the fast path', () => {
    const distillery = createFixtureDistillery();
    distillery.createStyleModule('plain', (t) => ({
      root: t.css`
        color: ${t.tokens.colors.ink};
        background: ${t.tokens.colors.surface};
      `,
    }));

    const css = distillery.renderStyles(distillery.stylesheetCollector());
    expect(css).toContain(
      '.plain-root{color:var(--eui-colors-ink);background:var(--eui-colors-surface)}'
    );
  });

  it('rejects at-rules in declaration blocks case-insensitively', () => {
    const distillery = createFixtureDistillery();
    expect(() =>
      distillery.createStyleModule('blocked', (t) => ({
        root: t.css`color: red; @MEDIA (min-width: 0)`,
      }))
    ).toThrow(/declaration blocks only/);
  });

  it('throws when a handle is interpolated into declaration position', () => {
    const distillery = createFixtureDistillery();
    const base = distillery.createStyleModule('src', (t) => ({
      mark: t.css`color: ${t.tokens.colors.ink};`,
    }));
    expect(() =>
      distillery.createStyleModule('bad', (t) => ({
        root: t.css`color: ${base.handles.mark};`,
      }))
    ).toThrow(/compose with the emotion compat css/);
  });

  it('preserves source order for more than nine nested siblings', () => {
    const distillery = createFixtureDistillery();
    distillery.createStyleModule('many', (t) => ({
      root: t.css`
        color: ${t.tokens.colors.ink};
        &[data-k="0"] { order: 0; }
        &[data-k="1"] { order: 1; }
        &[data-k="2"] { order: 2; }
        &[data-k="3"] { order: 3; }
        &[data-k="4"] { order: 4; }
        &[data-k="5"] { order: 5; }
        &[data-k="6"] { order: 6; }
        &[data-k="7"] { order: 7; }
        &[data-k="8"] { order: 8; }
        &[data-k="9"] { order: 9; }
        &[data-k="10"] { order: 10; }
      `,
    }));

    const css = distillery.renderStyles(distillery.stylesheetCollector());
    expect(css.indexOf('[data-k="2"]')).toBeLessThan(
      css.indexOf('[data-k="10"]')
    );
    expect(css.indexOf('[data-k="9"]')).toBeLessThan(
      css.indexOf('[data-k="10"]')
    );
  });
});

describe('readable name guards', () => {
  it('throws when a distillery prefix is not a CSS identifier segment', () => {
    expect(() =>
      createDistillery({
        prefix: '1eui',
        themeScope: '.x',
        theme: {},
      })
    ).toThrow(/Distillery prefix/);
  });

  it('throws when hyphen-joined class names collide across modules', () => {
    const distillery = createFixtureDistillery();
    distillery.createStyleModule('card', (t) => ({
      header: {
        title: t.css`
          color: ${t.tokens.colors.ink};
        `,
      },
    }));
    expect(() =>
      distillery.createStyleModule('card-header', (t) => ({
        title: t.css`
          color: ${t.tokens.colors.accent};
        `,
      }))
    ).toThrow(/Readable class name "card-header-title"/);
  });

  it('throws when hyphen-joined local var names collide', () => {
    const distillery = createFixtureDistillery();
    expect(() =>
      distillery.createStyleModule('a', (t) => {
        const first = t.vars('b-c', { d: '1' });
        const second = t.vars('b', { 'c-d': '2' });
        return {
          root: t.css`
            ${first}${second}
          `,
        };
      })
    ).toThrow(/Readable CSS variable "--eui-a-b-c-d"/);
  });

  it('throws when a local var collides with a theme var readable name', () => {
    const distillery = createDistillery({
      prefix: 'eui',
      themeScope: '.x',
      theme: {
        chip: {
          look: {
            bg: lightDark('#fff', '#000'),
          },
        },
      },
    });
    expect(() =>
      distillery.createStyleModule('chip', (t) => {
        const look = t.vars('look', { bg: '#abc' });
        return {
          root: t.css`
            ${look}
            background: ${look.bg};
          `,
        };
      })
    ).toThrow(
      /Readable CSS variable "--eui-chip-look-bg" collides between theme var "chip\/look\/bg"/
    );
  });

  it('throws when a local var collides with a shared var readable name', () => {
    const distillery = createDistillery({
      prefix: 'eui',
      themeScope: '.x',
      theme: {},
      sharedVars: ['vars/chip/look-bg'],
    });
    expect(() =>
      distillery.createStyleModule('chip', (t) => {
        const look = t.vars('look', { bg: '#abc' });
        return {
          root: t.css`
            ${look}
            background: ${look.bg};
          `,
        };
      })
    ).toThrow(
      /Readable CSS variable "--eui-chip-look-bg" collides between shared var "vars\/chip\/look-bg"/
    );
  });

  it('lets two modules reference the same deep shared var', () => {
    const distillery = createDistillery({
      prefix: 'eui',
      themeScope: '.x',
      theme: {},
      sharedVars: ['vars/app/tone/foreground'],
    });
    const shared = contextualVar(
      'vars/app/tone/foreground',
      '--eui-app-tone-foreground'
    );

    expect(() => {
      distillery.createStyleModule('chip', (t) => ({
        root: t.css`color: ${shared};`,
      }));
      distillery.createStyleModule('badge', (t) => ({
        root: t.css`color: ${shared};`,
      }));
    }).not.toThrow();
  });

  it('throws when themeVars and sharedVars hyphenate to the same property', () => {
    expect(() =>
      createDistillery({
        prefix: 'eui',
        themeScope: '.x',
        theme: {
          colors: {
            ink: lightDark('#111', '#eee'),
          },
        },
        sharedVars: ['vars/colors/ink'],
      })
    ).toThrow(
      /Readable CSS variable "--eui-colors-ink" collides between theme var "colors\/ink"/
    );
  });

  it('throws when a short unshared contextual path hyphenates onto a theme var', () => {
    const distillery = createDistillery({
      prefix: 'eui',
      themeScope: '.x',
      theme: {
        tone: {
          foreground: lightDark('#111', '#eee'),
        },
      },
    });
    const leaked = contextualVar(
      'vars/tone/foreground',
      '--eui-tone-foreground'
    );
    expect(() =>
      distillery.createStyleModule('chip', (t) => ({
        root: t.css`color: ${leaked};`,
      }))
    ).toThrow(
      /Readable CSS variable "--eui-tone-foreground" collides between theme var "tone\/foreground"/
    );
  });
});

describe('theme variations', () => {
  const baseTheme = {
    colors: {
      ink: lightDark('#111', '#eee'),
      accent: lightDark('#06c', '#8cf'),
    },
    gap: cq('8px', '2cqi'),
  };

  const createVariedDistillery = (themeScope: string) =>
    createDistillery({
      prefix: 'eui',
      themeScope,
      theme: baseTheme,
      variations: {
        muted: {
          colors: { accent: '#0077cc' },
        },
        highContrast: {
          media: '(prefers-contrast: more)',
          variation: {
            colors: {
              ink: lightDark('#000', '#fff'),
            },
          },
        },
      },
    });

  const collectAccent = (
    distillery: ReturnType<typeof createVariedDistillery>
  ) => {
    distillery.createStyleModule('demo', (t) => ({
      root: t.css`
        color: ${t.tokens.colors.accent};
        background: ${t.tokens.colors.ink};
      `,
    }));
    return distillery.stylesheetCollector();
  };

  it('does not emit declared variations until they are named at render', () => {
    const withVariations = createVariedDistillery('.eui-view');
    const withoutVariations = createDistillery({
      prefix: 'eui',
      themeScope: '.eui-view',
      theme: baseTheme,
    });
    const variedCss = withVariations.renderStyles(
      collectAccent(withVariations)
    );
    const baseCss = withoutVariations.renderStyles(
      collectAccent(withoutVariations)
    );
    expect(variedCss).toBe(baseCss);
    expect(variedCss).not.toContain('0077cc');
    expect(variedCss).not.toContain('prefers-contrast');
  });

  it('flattens a selected variation into themeScope at the same declaration count', () => {
    const distillery = createVariedDistillery('.eui-view');
    const collector = collectAccent(distillery);
    const base = distillery.renderStyles(collector);
    const selected = distillery.renderStyles(collector, undefined, {
      flatten: 'muted',
    });
    expect(selected).toContain('--eui-colors-accent:#0077cc');
    expect(selected).not.toContain('data-eui-theme');
    expect(selected.match(/\{/g)?.length).toBe(base.match(/\{/g)?.length);
  });

  it('emits alternate diffs under a class-composed selector', () => {
    const distillery = createVariedDistillery('.eui-view');
    const css = distillery.renderStyles(collectAccent(distillery), undefined, {
      alternates: [
        { variation: 'muted', selector: '[data-eui-theme="muted"]' },
      ],
    });
    expect(css).toContain(
      '.eui-view{--eui-colors-accent:light-dark(#06c,#8cf);--eui-colors-ink:light-dark(#111,#eee)}'
    );
    expect(css).toContain(
      '.eui-view[data-eui-theme="muted"]{--eui-colors-accent:#0077cc}'
    );
  });

  it('emits alternate diffs under :host()', () => {
    const distillery = createVariedDistillery(':host');
    const css = distillery.renderStyles(collectAccent(distillery), undefined, {
      alternates: [
        { variation: 'muted', selector: '[data-eui-theme="muted"]' },
      ],
    });
    expect(css).toContain(
      ':host([data-eui-theme="muted"]){--eui-colors-accent:#0077cc}'
    );
  });

  it('keeps the base primary block when flattening a media variation and wraps the diff', () => {
    const distillery = createVariedDistillery('.eui-view');
    const collector = collectAccent(distillery);
    const selected = distillery.renderStyles(collector, undefined, {
      flatten: 'highContrast',
    });
    expect(selected).toContain(
      '.eui-view{--eui-colors-accent:light-dark(#06c,#8cf);--eui-colors-ink:light-dark(#111,#eee)}'
    );
    expect(selected).toContain(
      '@media (prefers-contrast:more){.eui-view{--eui-colors-ink:light-dark(#000,#fff)}}'
    );

    const alternate = distillery.renderStyles(collector, undefined, {
      alternates: [{ variation: 'highContrast' }],
    });
    expect(alternate).toContain(
      '@media (prefers-contrast:more){.eui-view{--eui-colors-ink:light-dark(#000,#fff)}}'
    );
  });

  it('lets themeValueOverrides win over a flattened variation', () => {
    const distillery = createVariedDistillery('.eui-view');
    const css = distillery.renderStyles(collectAccent(distillery), undefined, {
      flatten: 'muted',
      themeValueOverrides: { 'colors/accent': '#ff00ff' },
    });
    expect(css).toContain('--eui-colors-accent:#ff00ff');
    expect(css).not.toContain('#0077cc');
  });

  it('throws for an unknown variation name', () => {
    const distillery = createVariedDistillery('.eui-view');
    const collector = collectAccent(distillery);
    expect(() =>
      distillery.renderStyles(collector, undefined, { flatten: 'missing' })
    ).toThrow(/Unknown variation "missing"/);
  });

  it('throws when a non-media alternate omits a selector', () => {
    const distillery = createVariedDistillery('.eui-view');
    const collector = collectAccent(distillery);
    expect(() =>
      distillery.renderStyles(collector, undefined, {
        alternates: [{ variation: 'muted' }],
      })
    ).toThrow(/needs a selector/);
  });
});
