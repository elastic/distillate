/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const src = (relative: string): string =>
  fileURLToPath(new URL(relative, import.meta.url));

export default defineConfig({
  base: process.env.PLAYGROUND_BASE ?? '/',
  plugins: [react()],
  worker: {
    format: 'es',
  },
  resolve: {
    alias: [
      {
        find: '@elastic/distillate/testing',
        replacement: src('../../src/testing.ts'),
      },
      {
        find: '@elastic/distillate/emotion',
        replacement: src('../../src/emotion.ts'),
      },
      {
        find: '@elastic/distillate',
        replacement: src('../../src/index.ts'),
      },
    ],
  },
});
