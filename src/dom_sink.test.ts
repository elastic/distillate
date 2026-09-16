/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import {
  createDomSink,
  type DocumentLike,
  type StyleElementLike,
} from './dom_sink';
import { createEmotion } from './emotion';
import { createDistillery } from './engine';

const stubDocument = (): {
  document: DocumentLike;
  elements: StyleElementLike[];
} => {
  const elements: StyleElementLike[] = [];
  return {
    elements,
    document: {
      createElement: () => {
        const element: StyleElementLike = { textContent: null };
        elements.push(element);
        return element;
      },
      head: { appendChild: () => {} },
    },
  };
};

const createFixtureDistillery = () =>
  createDistillery({
    prefix: 'eui',
    themeScope: '.eui-view',
    theme: {},
  });

describe('createDomSink', () => {
  it('lazily creates one managed style element and renders latest content', () => {
    const { document, elements } = stubDocument();
    const sink = createDomSink({ document, schedule: (flush) => flush() });

    sink.invalidate(() => 'A{}');
    sink.invalidate(() => 'B{}');

    expect(elements).toHaveLength(1);
    expect(elements[0]?.textContent).toBe('B{}');
  });

  it('debounces to a single flush per turn and renders only the latest', () => {
    const { document, elements } = stubDocument();
    const scheduled: Array<() => void> = [];
    const sink = createDomSink({
      document,
      schedule: (flush) => scheduled.push(flush),
    });

    let renders = 0;
    sink.invalidate(() => {
      renders += 1;
      return 'A{}';
    });
    sink.invalidate(() => {
      renders += 1;
      return 'B{}';
    });

    expect(scheduled).toHaveLength(1);
    scheduled[0]?.();
    expect(renders).toBe(1);
    expect(elements[0]?.textContent).toBe('B{}');
  });

  it('does not re-invalidate on a dedupe hit', () => {
    const { document } = stubDocument();
    let scheduleCount = 0;
    const sink = createDomSink({
      document,
      schedule: (flush) => {
        scheduleCount += 1;
        flush();
      },
    });
    const em = createEmotion(createFixtureDistillery(), { sink });
    const register = (): unknown => em.css`color: red;`;

    register();
    const afterFirst = scheduleCount;
    register();
    expect(scheduleCount).toBe(afterFirst);
  });

  it('flushes via the default microtask scheduler', async () => {
    const { document, elements } = stubDocument();
    const sink = createDomSink({ document });

    sink.invalidate(() => 'hello{}');
    await new Promise<void>((resolve) => queueMicrotask(resolve));

    expect(elements[0]?.textContent).toBe('hello{}');
  });
});
