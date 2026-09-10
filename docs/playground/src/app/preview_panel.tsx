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
