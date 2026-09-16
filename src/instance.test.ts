/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import {
  INSTANCE_KEY,
  type InstanceHost,
  registerDistillateInstance,
} from './instance';

const collectWarnings = () => {
  const warnings: string[] = [];
  return { warnings, warn: (message: string) => warnings.push(message) };
};

describe('single-copy guard', () => {
  it('records the first copy without warning', () => {
    const host: InstanceHost = {};
    const { warnings, warn } = collectWarnings();

    registerDistillateInstance(
      host,
      '/node_modules/@elastic/distillate.js',
      warn
    );

    expect(host[INSTANCE_KEY]).toBe('/node_modules/@elastic/distillate.js');
    expect(warnings).toEqual([]);
  });

  it('warns when a copy at a different location loads', () => {
    const host: InstanceHost = {};
    const { warnings, warn } = collectWarnings();

    registerDistillateInstance(host, '/app/node_modules/distillate.js', warn);
    registerDistillateInstance(host, '/lib/node_modules/distillate.js', warn);

    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('/lib/node_modules/distillate.js');
    expect(warnings[0]).toContain('/app/node_modules/distillate.js');
    expect(warnings[0]).toContain('Externalize @elastic/distillate');
  });

  it('warns rather than throws, since two copies degrade output but do not break it', () => {
    const host: InstanceHost = {};
    const { warn } = collectWarnings();

    registerDistillateInstance(host, '/one.js', warn);

    expect(() =>
      registerDistillateInstance(host, '/two.js', warn)
    ).not.toThrow();
  });

  // Test isolation, HMR, and a fresh module registry in the same process all
  // re-evaluate the same file. Warning on those would train a consumer to
  // ignore the one case that matters.
  it('stays quiet when the same copy is re-evaluated', () => {
    const host: InstanceHost = {};
    const { warnings, warn } = collectWarnings();

    registerDistillateInstance(host, '/same.js', warn);
    registerDistillateInstance(host, '/same.js', warn);
    registerDistillateInstance(host, '/same.js', warn);

    expect(warnings).toEqual([]);
  });

  it('keeps the first location registered, so the marker names the incumbent', () => {
    const host: InstanceHost = {};
    const { warn } = collectWarnings();

    registerDistillateInstance(host, '/first.js', warn);
    registerDistillateInstance(host, '/second.js', warn);

    expect(host[INSTANCE_KEY]).toBe('/first.js');
  });

  it('registers the real copy on globalThis at import', () => {
    const globalHost = globalThis as InstanceHost;

    expect(globalHost[INSTANCE_KEY]).toContain('instance');
  });
});
