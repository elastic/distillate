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

import {
  cq,
  createDistillery,
  type Distillery,
  lightDark,
  type StyleHandle,
  type TokensOf,
} from '@elastic/distillate';
import { createDomSink, createEmotion } from '@elastic/distillate/emotion';

const sansStack = 'system-ui, -apple-system, "Segoe UI", sans-serif';
const monoStack = 'ui-monospace, SFMono-Regular, Menlo, Monaco, monospace';

const chromeTheme = {
  color: {
    bg: lightDark('#f4f6f8', '#0f1218'),
    panel: lightDark('#ffffff', '#171b24'),
    ink: lightDark('#1b1e28', '#e6e8f0'),
    muted: lightDark('#5a6472', '#9aa4b6'),
    line: lightDark('#dce2ea', '#2b3242'),
    accent: lightDark('#0b64dd', '#7aa7ff'),
    danger: lightDark('#b42318', '#ff8a80'),
    code: lightDark('#0f141c', '#0b0e14'),
  },
  space: {
    s: cq('8px', '2cqi'),
    m: cq('16px', '4cqi'),
    l: cq('24px', '6cqi'),
  },
  radius: {
    s: cq('8px', '8px'),
    m: cq('12px', '12px'),
  },
  font: {
    sans: sansStack,
    mono: monoStack,
  },
};

export type ChromeTokens = TokensOf<typeof chromeTheme>;

export const distillery: Distillery<ChromeTokens> = createDistillery({
  prefix: 'pg',
  themeScope: ':root',
  theme: chromeTheme,
});

const barHeight = '40px';
const controlHeight = '28px';

export const ui = distillery.createStyleModule('ui', (t) => ({
  shell: t.css`
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
    overflow: hidden;
  `,
  top: t.css`
    display: flex;
    align-items: center;
    gap: 12px;
    height: ${barHeight};
    flex: 0 0 ${barHeight};
    padding: 0 12px;
    background: ${t.tokens.color.panel};
    border-block-end: 1px solid ${t.tokens.color.line};
    h1 {
      margin: 0;
      font-size: 0.95rem;
      font-weight: 600;
      letter-spacing: -0.02em;
      line-height: 1;
    }
  `,
  brand: t.css`
    color: ${t.tokens.color.accent};
    text-decoration: none;
    font-weight: 600;
    font-size: 0.85rem;
    line-height: 1;
  `,
  layout: t.css`
    flex: 1;
    min-width: 0;
    min-height: 0;
    display: grid;
    gap: 1px;
    background: ${t.tokens.color.line};
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: minmax(16rem, 42vh) minmax(0, 1fr);
    grid-template-areas:
      'source'
      'output';
    @media (min-width: 800px) {
      grid-template-columns: minmax(18rem, 32rem) minmax(0, 1fr);
      grid-template-rows: minmax(0, 1fr);
      grid-template-areas: 'source output';
    }
    @media (min-width: 1100px) {
      grid-template-columns: minmax(24rem, 40rem) minmax(0, 1fr);
    }
  `,
  dockSource: t.css`
    grid-area: source;
    display: grid;
    grid-template-rows: minmax(0, 1fr) minmax(16rem, 38%);
    min-width: 0;
    min-height: 0;
    gap: 1px;
    background: ${t.tokens.color.line};
    > * {
      min-height: 0;
    }
  `,
  dockOutput: t.css`
    grid-area: output;
    display: grid;
    grid-template-rows: minmax(0, 1fr) minmax(8rem, 28%);
    min-width: 0;
    min-height: 0;
    gap: 1px;
    background: ${t.tokens.color.line};
    > * {
      min-height: 0;
    }
  `,
  dockPreview: t.css`
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
  `,
  dockCss: t.css`
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
  `,
  panel: t.css`
    background: ${t.tokens.color.panel};
    overflow: hidden;
    min-width: 0;
    min-height: 0;
  `,
  toolbar: t.css`
    display: flex;
    flex-wrap: nowrap;
    gap: ${t.tokens.space.s};
    align-items: center;
    height: ${barHeight};
    flex: 0 0 ${barHeight};
    padding: 0 12px;
    overflow-x: auto;
    border-block-end: 1px solid ${t.tokens.color.line};
    h2 {
      margin: 0;
      font-size: 0.8rem;
      font-weight: 600;
      line-height: 1;
      flex: 1;
      white-space: nowrap;
    }
  `,
  segmented: t.css`
    display: inline-flex;
    height: ${controlHeight};
    border: 1px solid ${t.tokens.color.line};
    border-radius: ${t.tokens.radius.s};
    overflow: hidden;
    flex: 0 0 auto;
    button {
      font: inherit;
      font-size: 0.8rem;
      line-height: 1;
      background: transparent;
      color: ${t.tokens.color.ink};
      border: 0;
      height: 100%;
      padding: 0 10px;
      cursor: pointer;
      &[aria-pressed='true'] {
        background: ${t.tokens.color.accent};
        color: #fff;
      }
    }
  `,
  ghost: t.css`
    font: inherit;
    font-size: 0.8rem;
    line-height: 1;
    background: transparent;
    color: ${t.tokens.color.ink};
    border: 0;
    height: ${controlHeight};
    padding: 0 10px;
    cursor: pointer;
    margin-left: auto;
    flex: 0 0 auto;
  `,
  snippetSelect: t.css`
    display: inline-flex;
    gap: 6px;
    align-items: center;
    height: ${controlHeight};
    color: ${t.tokens.color.muted};
    font-size: 0.8rem;
    line-height: 1;
    flex: 0 0 auto;
    white-space: nowrap;
    select {
      font: inherit;
      font-size: 0.8rem;
      line-height: 1;
      color: ${t.tokens.color.ink};
      height: ${controlHeight};
      padding: 0 8px;
      cursor: pointer;
      border: 1px solid ${t.tokens.color.line};
      border-radius: ${t.tokens.radius.s};
      background: ${t.tokens.color.panel};
    }
  `,
  tokens: t.css`
    display: flex;
    flex-direction: column;
    min-height: 0;
  `,
  editor: t.css`
    display: flex;
    flex-direction: column;
    [data-pg-monaco] {
      flex: 1 1 auto;
      min-height: 0;
      width: 100%;
      color-scheme: dark;
      background: ${t.tokens.color.code};
    }
  `,
  cssOut: t.css`
    flex: 1 1 auto;
    min-height: 0;
    width: 100%;
    color-scheme: light;
    background: ${t.tokens.color.bg};
  `,
  cssStats: t.css`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    margin: 0;
    padding: 6px 12px;
    border-block-end: 1px solid ${t.tokens.color.line};
    color: ${t.tokens.color.muted};
    font-size: 0.75rem;
    line-height: 1.3;
    flex: 0 0 auto;
    a {
      color: ${t.tokens.color.accent};
      text-decoration: none;
      margin-left: auto;
    }
  `,
  previewHost: t.css`
    flex: 1 1 auto;
    min-height: 0;
    overflow: auto;
  `,
  tokenPanel: t.css`
    flex: 1 1 auto;
    min-height: 0;
    padding: 8px 12px 12px;
    overflow: auto;
  `,
  tokenTable: t.css`
    width: 100%;
    border-collapse: collapse;
    font-size: 0.75rem;
    th,
    td {
      text-align: left;
      padding: 5px 10px 5px 0;
      vertical-align: middle;
    }
    th {
      color: ${t.tokens.color.muted};
      font-weight: 600;
    }
    code {
      font-family: ${t.tokens.font.mono};
      font-size: 0.75rem;
    }
  `,
  tokenValue: t.css`
    display: inline-flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    color: ${t.tokens.color.muted};
    font-family: ${t.tokens.font.mono};
  `,
  swatch: t.css`
    width: 14px;
    height: 14px;
    border-radius: 3px;
    border: 1px solid ${t.tokens.color.line};
    flex: 0 0 auto;
    &[data-active] {
      outline: 2px solid ${t.tokens.color.accent};
      outline-offset: 1px;
    }
  `,
  callout: t.css`
    margin: 10px;
    padding: 10px 12px;
    border: 1px solid ${t.tokens.color.danger};
    border-radius: ${t.tokens.radius.s};
    color: ${t.tokens.color.danger};
    pre {
      margin: ${t.tokens.space.s} 0 0;
      white-space: pre-wrap;
      font-size: 12px;
    }
  `,
}));

const chromeEmotion = createEmotion(distillery);

const installChromeGlobals = (): void =>
  chromeEmotion.injectGlobal`
    :root {
      color-scheme: light dark;
      font-family: ${distillery.tokens.font.sans};
      background: ${distillery.tokens.color.bg};
      color: ${distillery.tokens.color.ink};
    }
    * {
      box-sizing: border-box;
    }
    html,
    body,
    #root {
      margin: 0;
      height: 100%;
    }
  `;

installChromeGlobals();

/** Readable class names for chrome handles. */
export const cx = (...handles: readonly StyleHandle[]): string =>
  handles.map((handle) => handle.readableName).join(' ');

/** Flushes the chrome stylesheet into `document`. Safe to call once at boot. */
export const mountChromeStyles = (document: Document): void => {
  createEmotion(distillery, { sink: createDomSink({ document }) });
};
