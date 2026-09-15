/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { type ReactNode, useEffect, useState } from 'react';

import { defaultSnippet, snippetById } from '../examples/snippets';
import {
  type CompileError,
  compilePlayground,
  type CompileSuccess,
  type PlaygroundMode,
} from '../lib/compile';
import { ui } from '../setup/chrome';

import { CssPanel } from './css_panel';
import { EditorPanel } from './editor_panel';
import { PreviewPanel } from './preview_panel';
import { TokensPanel } from './tokens_panel';
import type { CssTab, PreviewTheme } from './types';

const COMPILE_DEBOUNCE_MS = 150;
const { handles: h } = ui;

export const App = (): ReactNode => {
  const [mode, setMode] = useState<PlaygroundMode>('emotion');
  const [theme, setTheme] = useState<PreviewTheme>('light');
  const [cssTab, setCssTab] = useState<CssTab>('readable');
  const [snippetId, setSnippetId] = useState(defaultSnippet.id);
  const [sources, setSources] = useState<Record<PlaygroundMode, string>>(
    () => ({ ...defaultSnippet.source })
  );
  const [display, setDisplay] = useState<CompileSuccess | null>(null);
  const [error, setError] = useState<CompileError | null>(null);

  const source = sources[mode];

  const onSourceChange = (next: string): void =>
    setSources((current) => ({ ...current, [mode]: next }));

  const onSnippetChange = (id: string): void => {
    const snippet = snippetById(id);
    if (!snippet) {
      return;
    }
    setSnippetId(snippet.id);
    setSources({ ...snippet.source });
  };

  const onReset = (): void => {
    const snippet = snippetById(snippetId);
    if (!snippet) {
      return;
    }
    onSourceChange(snippet.source[mode]);
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const result = compilePlayground(source, mode);
      if (result.ok) {
        setDisplay(result);
        setError(null);
      } else {
        setError(result.error);
      }
    }, COMPILE_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [source, mode]);

  const onModeChange = (next: PlaygroundMode): void => setMode(next);

  return (
    <div className={h.shell.readableName}>
      <header className={h.top.readableName}>
        <a className={h.brand.readableName} href="../">
          Distillate
        </a>
        <h1>Playground</h1>
      </header>
      <div className={h.layout.readableName}>
        <div className={h.dockSource.readableName}>
          <EditorPanel
            {...{
              mode,
              snippetId,
              source,
              onModeChange,
              onReset,
              onSnippetChange,
              onSourceChange,
            }}
          />
          <TokensPanel {...{ theme }} />
        </div>
        <div className={h.dockOutput.readableName}>
          <PreviewPanel
            {...{ display, error, theme }}
            onThemeChange={setTheme}
          />
          <CssPanel {...{ cssTab, display }} onCssTabChange={setCssTab} />
        </div>
      </div>
    </div>
  );
};
