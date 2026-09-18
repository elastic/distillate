/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { register } from 'node:module';

register('./semantic_release_loader.js', import.meta.url);
await import('semantic-release/bin/semantic-release.js');
