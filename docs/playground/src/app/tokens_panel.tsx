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

import type { ReactNode } from 'react';

import {
  demoTokenCatalog,
  type DemoTokenCatalogEntry,
} from '../lib/demo_environment';
import { cx, ui } from '../setup/chrome';

import type { PreviewTheme } from './types';

const { handles: h } = ui;

const looksLikeCssColor = (value: string): boolean =>
  /^#|^rgba?\(|^hsla?\(|^oklch\(|^lab\(/i.test(value.trim());

export interface TokensPanelProps {
  readonly theme: PreviewTheme;
}

export const TokensPanel = ({ theme }: TokensPanelProps): ReactNode => (
  <section className={cx(h.panel, h.tokens)}>
    <div className={h.toolbar.readableName}>
      <h2>Tokens</h2>
    </div>
    <div className={h.tokenPanel.readableName}>
      <table className={h.tokenTable.readableName}>
        <thead>
          <tr>
            <th>Token</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          {demoTokenCatalog.map((entry) => (
            <tr key={entry.access}>
              <td>
                <code>{entry.access}</code>
              </td>
              <td>
                <TokenValue {...{ entry, theme }} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </section>
);

interface TokenValueProps {
  readonly entry: DemoTokenCatalogEntry;
  readonly theme: PreviewTheme;
}

const TokenValue = ({ entry, theme }: TokenValueProps): ReactNode => {
  if (entry.kind === 'scale') {
    return (
      <span className={h.tokenValue.readableName}>
        {entry.value}
        {entry.cq !== entry.value ? ` · .cq ${entry.cq}` : null}
      </span>
    );
  }

  const showSwatches =
    looksLikeCssColor(entry.light) || looksLikeCssColor(entry.dark);
  const same = entry.light === entry.dark;

  return (
    <span className={h.tokenValue.readableName}>
      {showSwatches ? (
        <>
          <ColorSwatch
            color={entry.light}
            active={theme === 'light'}
            scheme="light"
          />
          {same ? null : (
            <ColorSwatch
              color={entry.dark}
              active={theme === 'dark'}
              scheme="dark"
            />
          )}
        </>
      ) : null}
      {same ? entry.light : `${entry.light} / ${entry.dark}`}
    </span>
  );
};

interface ColorSwatchProps {
  readonly color: string;
  readonly active: boolean;
  readonly scheme: PreviewTheme;
}

const ColorSwatch = ({
  color,
  active,
  scheme,
}: ColorSwatchProps): ReactNode => (
  <span
    className={h.swatch.readableName}
    data-active={active ? '' : undefined}
    title={`${scheme} ${color}`}
    aria-label={`${scheme} ${color}`}
    style={{ background: color }}
  />
);
