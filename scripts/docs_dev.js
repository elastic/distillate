/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spawn, spawnSync } from 'node:child_process';

const probe = spawnSync('docs-builder', ['--help'], {
  encoding: 'utf8',
  stdio: 'pipe',
});

if (probe.error?.code === 'ENOENT') {
  console.error(
    'docs-builder is not on PATH. Install it, then re-run `pnpm docs:dev`:\n' +
      '  curl -sL https://ela.st/docs-builder-install | sh\n' +
      'It serves the site with live reload at http://localhost:3000'
  );
  process.exit(1);
}

const child = spawn('docs-builder', ['serve', ...process.argv.slice(2)], {
  stdio: 'inherit',
});

const stop = (signal) => {
  child.kill(signal);
};

process.on('SIGINT', () => stop('SIGINT'));
process.on('SIGTERM', () => stop('SIGTERM'));

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
