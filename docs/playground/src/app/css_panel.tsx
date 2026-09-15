/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { lazy, type ReactNode, Suspense, useMemo } from 'react';

import type { CompileSuccess } from '../lib/compile';
import { formatCss } from '../lib/format_css';
import { cx, ui } from '../setup/chrome';

import type { CssTab } from './types';

const { handles: h } = ui;

const MonacoCssEditor = lazy(async () => {
  const { MonacoCssEditor: Editor } = await import('./monaco_css_editor');
  return { default: Editor };
});

export interface CssPanelProps {
  readonly display: CompileSuccess | null;
  readonly cssTab: CssTab;
  readonly onCssTabChange: (tab: CssTab) => void;
}

const cssForTab = (display: CompileSuccess | null, cssTab: CssTab): string => {
  if (!display) {
    return '';
  }
  if (cssTab === 'readable') {
    return display.readableCss;
  }
  if (cssTab === 'compact') {
    return display.compactCss;
  }
  return display.artifactCss;
};

const formatBytes = (bytes: number): string =>
  `${bytes.toLocaleString('en-US')} B`;

const savedLabel = (display: CompileSuccess): string => {
  const { stylesheetBytes, artifactBytes } = display;
  if (stylesheetBytes === 0) {
    return '0% smaller';
  }
  const pct = Math.round((1 - artifactBytes / stylesheetBytes) * 100);
  if (pct === 0) {
    return 'same size';
  }
  if (pct < 0) {
    return `${Math.abs(pct)}% larger`;
  }
  return `${pct}% smaller`;
};

export const CssPanel = ({
  display,
  cssTab,
  onCssTabChange,
}: CssPanelProps): ReactNode => {
  const cssText = cssForTab(display, cssTab);
  const formatted = useMemo(() => formatCss(cssText), [cssText]);
  const value = formatted || '/* No CSS emitted yet. */';

  return (
    <section className={cx(h.panel, h.dockCss)}>
      <div className={h.toolbar.readableName}>
        <h2>Generated CSS</h2>
        <div
          className={h.segmented.readableName}
          role="group"
          aria-label="CSS output">
          <button
            type="button"
            aria-pressed={cssTab === 'readable'}
            onClick={() => onCssTabChange('readable')}>
            Readable
          </button>
          <button
            type="button"
            aria-pressed={cssTab === 'compact'}
            onClick={() => onCssTabChange('compact')}>
            Compact
          </button>
          <button
            type="button"
            aria-pressed={cssTab === 'artifact'}
            onClick={() => onCssTabChange('artifact')}>
            Artifact
          </button>
        </div>
      </div>
      {display ? (
        <p className={h.cssStats.readableName}>
          <span>Full stylesheet {formatBytes(display.stylesheetBytes)}</span>
          <span aria-hidden="true">·</span>
          <span>Compact artifact {formatBytes(display.artifactBytes)}</span>
          <span aria-hidden="true">·</span>
          <span>{savedLabel(display)}</span>
          <a href="../guides/compact-artifacts">How this is measured</a>
        </p>
      ) : null}
      <Suspense
        fallback={
          <div
            className={h.cssOut.readableName}
            data-pg-monaco=""
            aria-busy="true"
          />
        }>
        <MonacoCssEditor {...{ value }} />
      </Suspense>
    </section>
  );
};
