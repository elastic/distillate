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
