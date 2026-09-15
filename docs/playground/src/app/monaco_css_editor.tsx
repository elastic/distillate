/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import 'monaco-editor/languages/definitions/css/register.js';

import { type ReactNode, useEffect, useRef } from 'react';
import { editor, Uri } from 'monaco-editor/editor.js';

import { ui } from '../setup/chrome';
import { CSS_THEME, ensureMonaco } from '../setup/monaco_env';

const { handles: h } = ui;

const MODEL_URI = 'file:///playground.css';

interface MonacoCssEditorProps {
  readonly value: string;
}

export const MonacoCssEditor = ({ value }: MonacoCssEditorProps): ReactNode => {
  const hostRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return;
    }
    const initialValue = value;
    ensureMonaco();
    const uri = Uri.parse(MODEL_URI);
    const existing = editor.getModel(uri);
    const model = existing ?? editor.createModel(initialValue, 'css', uri);
    if (existing && existing.getValue() !== initialValue) {
      existing.setValue(initialValue);
    }
    const instance = editor.create(host, {
      model,
      theme: CSS_THEME,
      readOnly: true,
      domReadOnly: true,
      automaticLayout: true,
      minimap: { enabled: false },
      fontSize: 13,
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, monospace',
      lineHeight: 20,
      tabSize: 2,
      insertSpaces: true,
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      padding: { top: 12, bottom: 12 },
      fixedOverflowWidgets: true,
      ariaLabel: 'Generated CSS',
      renderLineHighlight: 'none',
      overviewRulerLanes: 0,
      hideCursorInOverviewRuler: true,
      contextmenu: false,
      links: false,
      scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10 },
    });
    editorRef.current = instance;
    return () => {
      instance.dispose();
      editorRef.current = null;
      model.dispose();
    };
  }, []);

  useEffect(() => {
    const instance = editorRef.current;
    if (!instance || instance.getValue() === value) {
      return;
    }
    instance.setValue(value);
  }, [value]);

  return (
    <div ref={hostRef} className={h.cssOut.readableName} data-pg-monaco="" />
  );
};
