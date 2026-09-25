/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import type { StylesCollector } from './collector';
import { createDistillery } from './engine';
import { media, rule } from './styles';
import { lightDark } from './tokens';

const createFixture = () => {
  const distillery = createDistillery({
    prefix: 'eui',
    themeScope: '.eui-view',
    theme: {
      colors: {
        ink: lightDark('#111', '#eee'),
        accent: lightDark('#06c', '#8cf'),
      },
    },
  });
  const demo = distillery.createStyleModule('demo', (t) => ({
    first: t.css`
      color: ${t.tokens.colors.ink};
    `,
    second: t.css`
      color: ${t.tokens.colors.accent};
    `,
    hover: rule(
      (h) => `${h.first}:hover`,
      t.decls`
        opacity: 0.5;
      `
    ),
    manual: rule(
      (h) => `${h.second}:focus`,
      t.decls`
        outline: none;
      `,
      { auto: false }
    ),
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
      rule(
        (h) => `${h.first}:focus-visible`,
        t.decls`
          outline: none;
        `,
        { auto: false }
      ),
    ]),
  }));
  return { distillery, demo };
};

const countNotifications = (
  collector: StylesCollector
): { readonly count: () => number } => {
  let count = 0;
  collector.subscribe(() => {
    count += 1;
  });
  return { count: () => count };
};

describe('StylesCollector.subscribe', () => {
  it('notifies once for an array holding several new entries', () => {
    const { distillery, demo } = createFixture();
    const collector = distillery.artifactCollector('readable');
    const notifications = countNotifications(collector);

    collector.use([demo.handles.first, demo.handles.second]);
    expect(notifications.count()).toBe(1);

    collector.use([demo.handles.first, demo.handles.second]);
    expect(notifications.count()).toBe(1);
  });

  it('notifies once when a new handle also activates dependent rules', () => {
    const { distillery, demo } = createFixture();
    const collector = distillery.artifactCollector('readable');
    const notifications = countNotifications(collector);

    collector.useHandles([demo.handles.first]);
    expect(notifications.count()).toBe(1);
    const css = distillery.renderStyles(collector);
    expect(css).toContain('.demo-first:hover');
    expect(css).toContain('@media (max-width:400px){.demo-first');
  });

  it('does not notify for handles already collected', () => {
    const { distillery, demo } = createFixture();
    const collector = distillery.artifactCollector('readable');
    collector.useHandles([demo.handles.first]);
    const notifications = countNotifications(collector);

    // Re-activation rebuilds the filtered media entry without changing it.
    collector.useHandles([demo.handles.first]);
    collector.useHandles([demo.handles.first]);
    expect(notifications.count()).toBe(0);
  });

  it('does not notify when a handle activates a media block use() already collected', () => {
    const { distillery, demo } = createFixture();
    const collector = distillery.artifactCollector('readable');
    collector.use(demo);
    const notifications = countNotifications(collector);

    collector.useHandles([demo.handles.first]);
    expect(notifications.count()).toBe(0);
  });

  it('notifies once when a media block gains a live rule', () => {
    const { distillery, demo } = createFixture();
    const collector = distillery.artifactCollector('readable');
    collector.useHandles([demo.handles.first]);
    const notifications = countNotifications(collector);

    collector.useHandles([demo.handles.second]);
    expect(notifications.count()).toBe(1);
    expect(distillery.renderStyles(collector)).toContain(
      '.demo-second{display:block}'
    );
  });

  it('notifies for rules collected by useRulesWhenDepsMet', () => {
    const { distillery, demo } = createFixture();
    const collector = distillery.artifactCollector('readable');
    collector.useHandles([demo.handles.second]);
    expect(distillery.renderStyles(collector)).not.toContain(':focus');
    const notifications = countNotifications(collector);

    collector.useRulesWhenDepsMet(demo);
    expect(notifications.count()).toBe(1);
    expect(distillery.renderStyles(collector)).toContain('.demo-second:focus');

    collector.useRulesWhenDepsMet(demo);
    expect(notifications.count()).toBe(1);
  });

  it('notifies for a new theme var only', () => {
    const { distillery } = createFixture();
    const collector = distillery.artifactCollector('readable');
    const notifications = countNotifications(collector);

    collector.useThemeVar('colors/ink');
    collector.useThemeVar('colors/ink');
    expect(notifications.count()).toBe(1);
  });

  it('notifies once per use(module) or useAllEntries call that grows', () => {
    const { distillery, demo } = createFixture();
    const viaUse = distillery.artifactCollector('readable');
    const useNotifications = countNotifications(viaUse);
    viaUse.use(demo);
    viaUse.use(demo);
    expect(useNotifications.count()).toBe(1);

    const viaAll = distillery.artifactCollector('readable');
    const allNotifications = countNotifications(viaAll);
    viaAll.useAllEntries(demo);
    viaAll.useAllEntries(demo);
    expect(allNotifications.count()).toBe(1);
  });

  it('stops notifying after unsubscribe', () => {
    const { distillery, demo } = createFixture();
    const collector = distillery.artifactCollector('readable');
    let count = 0;
    const unsubscribe = collector.subscribe(() => {
      count += 1;
    });

    unsubscribe();
    collector.useHandles([demo.handles.first]);
    expect(count).toBe(0);
  });

  it('treats a mutation from inside a listener as a new outermost call', () => {
    const { distillery, demo } = createFixture();
    const collector = distillery.artifactCollector('readable');
    let count = 0;
    collector.subscribe(() => {
      count += 1;
      collector.useHandles([demo.handles.second]);
    });

    collector.useHandles([demo.handles.first]);
    expect(count).toBe(2);

    collector.useHandles([demo.handles.first]);
    expect(count).toBe(2);

    collector.use(demo.handles.manual);
    expect(count).toBe(3);
  });
});
