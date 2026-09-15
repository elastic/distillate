/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const apiDir = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../docs/reference/api'
);

const htmlAnchor = /<a id="([^"]+)"><\/a>\s*/g;

for (const name of readdirSync(apiDir)) {
  if (!name.endsWith('.md')) {
    continue;
  }
  const path = join(apiDir, name);
  const before = readFileSync(path, 'utf8');
  const after = before.replace(htmlAnchor, (_match, id) => `$$$${id}$$$ `);
  if (after !== before) {
    writeFileSync(path, after);
  }
}
