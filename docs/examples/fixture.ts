/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { cq, createDistillery, lightDark } from '../../src/index';

export const createExampleDistillery = () =>
  createDistillery({
    prefix: 'eui',
    themeScope: '.eui-view',
    theme: {
      colors: {
        ink: lightDark('#111', '#eee'),
        accent: lightDark('#06c', '#8cf'),
        surface: lightDark('#fff', '#000'),
      },
      gap: cq('8px', '2cqi'),
    },
  });
