/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import 'monaco-editor/languages/definitions/typescript/register.js';

import { type ReactNode, useEffect, useRef } from 'react';
import { editor, Uri } from 'monaco-editor/editor.js';
import {
  ModuleKind,
  ModuleResolutionKind,
  ScriptTarget,
  typescriptDefaults,
} from 'monaco-editor/languages/features/typescript/register.js';

import type { PlaygroundMode } from '../lib/compile';
import { extraLibSource, PLAYGROUND_EXTRA_LIB_PATH } from '../lib/editor_lib';
import { ensureMonaco, SOURCE_THEME } from '../setup/monaco_env';

const MODEL_URI = 'file:///playground.ts';

let monacoReady = false;

const ensureSourceLanguage = (): void => {
  if (monacoReady) {
    return;
  }
  monacoReady = true;
  ensureMonaco();
  typescriptDefaults.setCompilerOptions({
    target: ScriptTarget.ESNext,
    module: ModuleKind.ESNext,
    moduleResolution: ModuleResolutionKind.NodeJs,
    lib: ['es2022', 'dom'],
    strict: true,
    noEmit: true,
    allowNonTsExtensions: true,
  });
  typescriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false,
    diagnosticCodesToIgnore: [1108],
  });
};

const syncExtraLib = (mode: PlaygroundMode): void => {
  typescriptDefaults.setExtraLibs([
    { content: extraLibSource(mode), filePath: PLAYGROUND_EXTRA_LIB_PATH },
  ]);
};

interface MonacoSourceEditorProps {
  readonly mode: PlaygroundMode;
  readonly source: string;
  readonly onSourceChange: (source: string) => void;
}

export const MonacoSourceEditor = ({
  mode,
  source,
  onSourceChange,
}: MonacoSourceEditorProps): ReactNode => {
  const hostRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const onSourceChangeRef = useRef(onSourceChange);
  onSourceChangeRef.current = onSourceChange;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return;
    }
    const initialMode = mode;
    const initialSource = source;
    ensureSourceLanguage();
    syncExtraLib(initialMode);
    const uri = Uri.parse(MODEL_URI);
    const existing = editor.getModel(uri);
    const model =
      existing ?? editor.createModel(initialSource, 'typescript', uri);
    if (existing && existing.getValue() !== initialSource) {
      existing.setValue(initialSource);
    }
    const instance = editor.create(host, {
      model,
      theme: SOURCE_THEME,
      automaticLayout: true,
      minimap: { enabled: false },
      fontSize: 13,
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, monospace',
      lineHeight: 20,
      tabSize: 2,
      insertSpaces: true,
      scrollBeyondLastLine: false,
      wordWrap: 'off',
      padding: { top: 12, bottom: 12 },
      fixedOverflowWidgets: true,
      ariaLabel: 'Playground source',
      renderLineHighlight: 'line',
      overviewRulerLanes: 0,
      hideCursorInOverviewRuler: true,
      scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10 },
    });
    editorRef.current = instance;
    const sub = instance.onDidChangeModelContent(() => {
      onSourceChangeRef.current(instance.getValue());
    });
    return () => {
      sub.dispose();
      instance.dispose();
      editorRef.current = null;
      model.dispose();
    };
  }, []);

  useEffect(() => {
    syncExtraLib(mode);
  }, [mode]);

  useEffect(() => {
    const instance = editorRef.current;
    if (!instance || instance.getValue() === source) {
      return;
    }
    instance.setValue(source);
  }, [source]);

  return <div ref={hostRef} data-pg-monaco="" />;
};
