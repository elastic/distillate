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

import type { PlaygroundMode } from '../lib/compile';

export interface Snippet {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly source: string;
}

/** One playground example with Emotion and Native sources under a shared id. */
export interface SnippetCatalogEntry {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly source: Record<PlaygroundMode, string>;
}

const cardEmotion = `// Emotion-style authoring. In scope: css, cx, injectGlobal, cn, tokens.

const card = css\`
  display: grid;
  gap: \${tokens.space.s};
  padding: \${tokens.space.l};
  border: 1px solid \${tokens.color.border};
  border-radius: \${tokens.radius.m};
  background: \${tokens.color.surface};
  color: \${tokens.color.text};
  font-family: \${tokens.font.sans};

  & h3 {
    margin: 0;
    color: \${tokens.color.accent};
  }

  &:hover {
    border-color: \${tokens.color.accent};
  }
\`;

return \`
  <article class="\${card}">
    <h3>Distillate</h3>
    <p>Edit the styles on the left and watch the output update.</p>
  </article>
\`;
`;

const cardNative = `// Native distillate module. In scope: createStyleModule, rule, media,
// container, variants, cn, tokens.

const styles = createStyleModule('card', ({ css, tokens }) => ({
  root: css\`
    display: grid;
    gap: \${tokens.space.s};
    padding: \${tokens.space.l};
    border: 1px solid \${tokens.color.border};
    border-radius: \${tokens.radius.m};
    background: \${tokens.color.surface};
    color: \${tokens.color.text};
    font-family: \${tokens.font.sans};

    & h3 {
      margin: 0;
      color: \${tokens.color.accent};
    }

    &:hover {
      border-color: \${tokens.color.accent};
    }
  \`,
}));

return \`
  <article class="\${cn(styles.handles.root)}">
    <h3>Distillate</h3>
    <p>Edit the module on the left and watch the output update.</p>
  </article>
\`;
`;

const buttonsEmotion = `// Composition + media + a global reset via injectGlobal.

injectGlobal\`
  .demo-shell { margin: 0; display: grid; gap: \${tokens.space.m}; }
\`;

const base = css\`
  padding: \${tokens.space.s} \${tokens.space.m};
  border: 0;
  border-radius: \${tokens.radius.s};
  font-family: \${tokens.font.sans};
  cursor: pointer;
\`;

const primary = css\`
  \${base};
  background: \${tokens.color.accent};
  color: white;

  @media (min-width: 480px) {
    padding: \${tokens.space.m} \${tokens.space.l};
  }
\`;

const subtle = css\`
  \${base};
  background: \${tokens.color.surface};
  color: \${tokens.color.text};
  border: 1px solid \${tokens.color.border};
\`;

return \`
  <div class="demo-shell">
    <button class="\${cx(primary)}">Primary</button>
    <button class="\${cx(subtle)}">Subtle</button>
  </div>
\`;
`;

const buttonsNative = `// Variants stay off always-on collection; naming a handle includes it.

const button = createStyleModule('button', ({ css, tokens }) => ({
  root: css\`
    padding: \${tokens.space.s} \${tokens.space.m};
    border: 0;
    border-radius: \${tokens.radius.s};
    font-family: \${tokens.font.sans};
    cursor: pointer;
  \`,
  tone: variants(['primary', 'subtle'] as const, (tone) =>
    tone === 'primary'
      ? css\`
          background: \${tokens.color.accent};
          color: white;
        \`
      : css\`
          background: \${tokens.color.surface};
          color: \${tokens.color.text};
          border: 1px solid \${tokens.color.border};
        \`
  ),
}));

return \`
  <div style="display: grid; gap: 12px; justify-items: start;">
    <button class="\${cn(button.handles.root, button.handles.tone.primary)}">Primary</button>
    <button class="\${cn(button.handles.root, button.handles.tone.subtle)}">Subtle</button>
  </div>
\`;
`;

const shakeEmotion = `// Markup names one handle. The stylesheet still contains the rest.

const chip = css\`
  display: inline-flex;
  align-items: center;
  padding: \${tokens.space.s} \${tokens.space.m};
  border-radius: \${tokens.radius.s};
  background: \${tokens.color.surface};
  color: \${tokens.color.text};
  font-family: \${tokens.font.sans};
\`;

const calm = css\`
  \${chip};
  box-shadow: none;
\`;

const loud = css\`
  \${chip};
  box-shadow: 0 0 0 2px \${tokens.color.danger};
\`;

return \`
  <span class="\${cx(calm)}">Calm</span>
\`;
`;

const shakeNative = `// Markup names one variant. The stylesheet still contains the rest.

const chip = createStyleModule('chip', ({ css, tokens, vars }) => {
  const look = vars('look', {
    bg: tokens.color.surface,
    fg: tokens.color.text,
    ring: tokens.color.danger,
  });
  return {
    root: css\`
      \${look}
      display: inline-flex;
      align-items: center;
      padding: \${tokens.space.s} \${tokens.space.m};
      border-radius: \${tokens.radius.s};
      background: \${look.bg};
      color: \${look.fg};
      font-family: \${tokens.font.sans};
    \`,
    tone: variants(['calm', 'loud'] as const, (tone) =>
      tone === 'calm'
        ? css\`
            box-shadow: none;
          \`
        : css\`
            \${look}
            box-shadow: 0 0 0 2px \${look.ring};
          \`
    ),
  };
});

return \`
  <span class="\${cn(chip.handles.root, chip.handles.tone.calm)}">Calm</span>
\`;
`;

const varsEmotion = `// Emotion has no vars(); compose a second handle to override.

const chip = css\`
  display: inline-block;
  padding: \${tokens.space.s} \${tokens.space.m};
  border-radius: \${tokens.radius.s};
  background: \${tokens.color.surface};
  color: \${tokens.color.text};
  font-family: \${tokens.font.sans};
\`;

const accent = css\`
  \${chip};
  background: \${tokens.color.accent};
  color: #fff;
\`;

return \`
  <div style="display: flex; gap: 8px;">
    <span class="\${cx(chip)}">Default</span>
    <span class="\${cx(accent)}">Accent</span>
  </div>
\`;
`;

const varsNative = `// Module-local vars. \${look} declares defaults; \${look.bg} reads.

const chip = createStyleModule('chip', ({ css, tokens, vars }) => {
  const look = vars('look', {
    bg: tokens.color.surface,
    fg: tokens.color.text,
  });
  return {
    root: css\`
      \${look}
      display: inline-block;
      padding: \${tokens.space.s} \${tokens.space.m};
      border-radius: \${tokens.radius.s};
      background: \${look.bg};
      color: \${look.fg};
      font-family: \${tokens.font.sans};
    \`,
    accent: css\`
      \${look.set({ bg: tokens.color.accent, fg: '#fff' })}
    \`,
  };
});

return \`
  <div style="display: flex; gap: 8px;">
    <span class="\${cn(chip.handles.root)}">Default</span>
    <span class="\${cn(chip.handles.root, chip.handles.accent)}">Accent</span>
  </div>
\`;
`;

const mediaEmotion = `// Nested @media. @container inside css is rejected; Native uses the factory.

const band = css\`
  display: flex;
  gap: \${tokens.space.s};
  padding: \${tokens.space.m};
  background: \${tokens.color.surface};
  color: \${tokens.color.text};
  font-family: \${tokens.font.sans};

  @media (max-width: 600px) {
    flex-direction: column;
  }
\`;

return \`
  <div class="\${cx(band)}">
    <span>One</span>
    <span>Two</span>
    <span>Three</span>
  </div>
\`;
`;

const mediaNative = `// media(...) and container(...) factories. @container inside css is rejected.

const band = createStyleModule('band', ({ css, decls, tokens }) => ({
  root: css\`
    display: flex;
    gap: \${tokens.space.s};
    padding: \${tokens.space.m};
    background: \${tokens.color.surface};
    color: \${tokens.color.text};
    font-family: \${tokens.font.sans};
    container-type: inline-size;
  \`,
  stacked: media('(max-width: 600px)', [
    rule(
      (h) => \`\${h.root}\`,
      decls\`
        flex-direction: column;
      \`
    ),
  ]),
  wide: container('(min-width: 400px)', [
    rule(
      (h) => \`\${h.root}\`,
      decls\`
        gap: \${tokens.space.l};
      \`
    ),
  ]),
}));

return \`
  <div class="\${cn(band.handles.root)}">
    <span>One</span>
    <span>Two</span>
    <span>Three</span>
  </div>
\`;
`;

const asMode = (entry: SnippetCatalogEntry, mode: PlaygroundMode): Snippet => ({
  id: entry.id,
  label: entry.label,
  description: entry.description,
  source: entry.source[mode],
});

/** Shared dropdown catalog. Switching Emotion vs Native keeps the selected id. */
export const snippetCatalog: readonly SnippetCatalogEntry[] = [
  {
    id: 'card',
    label: 'Card',
    description: 'Nested selectors, tokens, and a hover state.',
    source: { emotion: cardEmotion, native: cardNative },
  },
  {
    id: 'buttons',
    label: 'Buttons',
    description: 'Primary and subtle actions.',
    source: { emotion: buttonsEmotion, native: buttonsNative },
  },
  {
    id: 'tree-shake',
    label: 'Tree shake',
    description:
      'One named style versus the full stylesheet; sizes in the CSS pane.',
    source: { emotion: shakeEmotion, native: shakeNative },
  },
  {
    id: 'local-vars',
    label: 'Local vars',
    description:
      'Default and accent chips. Native uses vars(); Emotion composes an override.',
    source: { emotion: varsEmotion, native: varsNative },
  },
  {
    id: 'media',
    label: 'Media + container',
    description:
      'Responsive rules. Native uses the factories; Emotion nests @media.',
    source: { emotion: mediaEmotion, native: mediaNative },
  },
];

export const snippets: Record<PlaygroundMode, readonly Snippet[]> = {
  emotion: snippetCatalog.map((entry) => asMode(entry, 'emotion')),
  native: snippetCatalog.map((entry) => asMode(entry, 'native')),
};

export const defaultSnippetSource = (mode: PlaygroundMode): string =>
  snippets[mode]?.[0]?.source ?? '';

/** Cross-mode snippet bundle used by the app to initialise and reset editor sources. */
export interface SnippetBundle {
  readonly id: string;
  readonly source: Record<PlaygroundMode, string>;
}

const first = snippetCatalog[0];

/** Default snippet for initial app state. */
export const defaultSnippet: SnippetBundle = {
  id: first?.id ?? '',
  source: {
    emotion: first?.source.emotion ?? '',
    native: first?.source.native ?? '',
  },
};

/** Looks up a snippet by shared id; returns both Emotion and Native sources. */
export const snippetById = (id: string): SnippetBundle | undefined => {
  const found = snippetCatalog.find((item) => item.id === id);
  if (!found) {
    return undefined;
  }
  return { id: found.id, source: { ...found.source } };
};
