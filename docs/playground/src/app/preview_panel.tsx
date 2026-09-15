/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { type ReactNode, useEffect, useRef } from 'react';

import type { CompileError, CompileSuccess } from '../lib/compile';
import { cx, ui } from '../setup/chrome';

import type { PreviewTheme } from './types';

const { handles: h } = ui;

const stageLabel: Record<CompileError['stage'], string> = {
  transform: 'Syntax error',
  evaluate: 'Runtime error',
  render: 'Render error',
};

export interface PreviewPanelProps {
  readonly display: CompileSuccess | null;
  readonly error: CompileError | null;
  readonly theme: PreviewTheme;
  readonly onThemeChange: (theme: PreviewTheme) => void;
}

export const PreviewPanel = ({
  display,
  error,
  theme,
  onThemeChange,
}: PreviewPanelProps): ReactNode => {
  return (
    <section className={cx(h.panel, h.dockPreview)}>
      {error ? (
        <div className={h.callout.readableName} role="alert">
          <strong>{stageLabel[error.stage]}</strong>
          <pre>{error.message}</pre>
        </div>
      ) : null}
      <div className={h.toolbar.readableName}>
        <h2>Preview</h2>
        <div
          className={h.segmented.readableName}
          role="group"
          aria-label="Preview color scheme">
          <button
            type="button"
            aria-pressed={theme === 'light'}
            onClick={() => onThemeChange('light')}>
            Light
          </button>
          <button
            type="button"
            aria-pressed={theme === 'dark'}
            onClick={() => onThemeChange('dark')}>
            Dark
          </button>
        </div>
      </div>
      <PreviewHost
        html={display?.previewHtml ?? ''}
        readableCss={display?.readableCss ?? ''}
        {...{ theme }}
      />
    </section>
  );
};

interface PreviewHostProps {
  readonly html: string;
  readonly readableCss: string;
  readonly theme: PreviewTheme;
}

const PreviewHost = ({
  html,
  readableCss,
  theme,
}: PreviewHostProps): ReactNode => {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return;
    }
    const shadow = host.shadowRoot ?? host.attachShadow({ mode: 'open' });
    shadow.innerHTML =
      `<style>:host{color-scheme:${theme};display:block;height:100%;background:${theme === 'dark' ? '#0B1628' : '#FFFFFF'};box-sizing:border-box}[data-pg-stage]{min-height:100%;display:flex;align-items:center;justify-content:center;padding:24px;box-sizing:border-box}</style>` +
      `<style>${readableCss}</style>` +
      `<div data-pg-stage="">${html}</div>`;
  }, [html, readableCss, theme]);

  return <div ref={hostRef} className={h.previewHost.readableName} />;
};
