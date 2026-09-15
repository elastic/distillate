/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export const formatCss = (css: string): string => {
  if (!css) {
    return '';
  }
  const lines: string[] = [];
  let current = '';
  let depth = 0;
  let quote: '"' | "'" | null = null;

  const indent = (level: number): string => '  '.repeat(Math.max(level, 0));
  const flush = (level: number): void => {
    const trimmed = current.trim();
    if (trimmed) {
      lines.push(indent(level) + trimmed);
    }
    current = '';
  };

  for (let i = 0; i < css.length; i += 1) {
    const char = css[i];

    if (quote) {
      current += char;
      if (char === quote && css[i - 1] !== '\\') {
        quote = null;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      current += char;
      continue;
    }

    if (char === '{') {
      current += ' {';
      flush(depth);
      depth += 1;
      continue;
    }

    if (char === '}') {
      if (current.trim()) {
        current += ';';
      }
      flush(depth);
      depth -= 1;
      lines.push(indent(depth) + '}');
      continue;
    }

    if (char === ';') {
      current += ';';
      flush(depth);
      continue;
    }

    current += char;
  }

  flush(depth);
  return lines.join('\n');
};
