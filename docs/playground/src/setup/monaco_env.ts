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

import 'monaco-editor/features/register.all.js';

import { editor } from 'monaco-editor/editor.js';
import EditorWorker from 'monaco-editor/editor/editor.worker.js?worker';
import CssWorker from 'monaco-editor/language/css/css.worker.js?worker';
import TsWorker from 'monaco-editor/language/typescript/ts.worker.js?worker';

export const SOURCE_THEME = 'distillate-code';
export const CSS_THEME = 'distillate-css';

const SOURCE_BG = '#0f141c';
const SOURCE_FG = '#e6e8f0';
const CSS_BG = '#f4f6f8';
const CSS_FG = '#1b1e28';

const installMonacoWorkers = (): void => {
  self.MonacoEnvironment = {
    getWorker: (_workerId: string, label: string): Worker => {
      if (label === 'typescript' || label === 'javascript') {
        return new TsWorker();
      }
      if (label === 'css') {
        return new CssWorker();
      }
      return new EditorWorker();
    },
  };
};

let monacoReady = false;

/** Installs workers and playground themes. Call once before creating an editor. */
export const ensureMonaco = (): void => {
  if (monacoReady) {
    return;
  }
  monacoReady = true;
  installMonacoWorkers();
  editor.defineTheme(SOURCE_THEME, {
    base: 'vs-dark',
    inherit: true,
    rules: [],
    colors: {
      'editor.background': SOURCE_BG,
      'editor.foreground': SOURCE_FG,
    },
  });
  editor.defineTheme(CSS_THEME, {
    base: 'vs',
    inherit: true,
    rules: [],
    colors: {
      'editor.background': CSS_BG,
      'editor.foreground': CSS_FG,
    },
  });
};
