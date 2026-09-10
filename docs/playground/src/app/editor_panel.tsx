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

import { type ChangeEvent, lazy, type ReactNode, Suspense } from 'react';

import { snippetCatalog } from '../examples/snippets';
import type { PlaygroundMode } from '../lib/compile';
import { cx, ui } from '../setup/chrome';

const { handles: h } = ui;

const MonacoSourceEditor = lazy(async () => {
  const { MonacoSourceEditor: Editor } = await import('./monaco_source_editor');
  return { default: Editor };
});

export interface EditorPanelProps {
  readonly mode: PlaygroundMode;
  readonly snippetId: string;
  readonly source: string;
  readonly onModeChange: (mode: PlaygroundMode) => void;
  readonly onReset: () => void;
  readonly onSnippetChange: (id: string) => void;
  readonly onSourceChange: (source: string) => void;
}

export const EditorPanel = ({
  mode,
  snippetId,
  source,
  onModeChange,
  onReset,
  onSnippetChange,
  onSourceChange,
}: EditorPanelProps): ReactNode => {
  return (
    <section className={cx(h.panel, h.editor)}>
      <div className={h.toolbar.readableName}>
        <div
          className={h.segmented.readableName}
          role="group"
          aria-label="Authoring mode">
          <button
            type="button"
            aria-pressed={mode === 'emotion'}
            onClick={() => onModeChange('emotion')}>
            Emotion css
          </button>
          <button
            type="button"
            aria-pressed={mode === 'native'}
            onClick={() => onModeChange('native')}>
            Native module
          </button>
        </div>
        <label className={h.snippetSelect.readableName}>
          <span>Example</span>
          <select
            value={snippetId}
            aria-label="Example"
            onChange={(event: ChangeEvent<HTMLSelectElement>) => {
              onSnippetChange(event.target.value);
            }}>
            {snippetCatalog.map((snippet) => (
              <option key={snippet.id} value={snippet.id}>
                {snippet.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className={h.ghost.readableName}
          onClick={onReset}>
          Reset
        </button>
      </div>
      <Suspense fallback={<div data-pg-monaco="" aria-busy="true" />}>
        <MonacoSourceEditor {...{ mode, source, onSourceChange }} />
      </Suspense>
    </section>
  );
};
