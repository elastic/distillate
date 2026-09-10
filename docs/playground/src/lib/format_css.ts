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
