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
