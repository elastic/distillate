/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './app';
import { mountChromeStyles } from './setup/chrome';

const root = document.getElementById('root');
if (!root) {
  throw new Error('Missing #root');
}

mountChromeStyles(document);

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
);
