/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import js from '@eslint/js';
import licenseHeader from 'eslint-plugin-license-header';
import prettierRecommended from 'eslint-plugin-prettier/recommended';
import simpleImportSortPlugin from 'eslint-plugin-simple-import-sort';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const DUAL_LICENSE_HEADER = [
  '/*',
  ' * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one',
  ' * or more contributor license agreements. Licensed under the Elastic License',
  ' * 2.0 and the Server Side Public License, v 1; you may not use this file except',
  ' * in compliance with, at your election, the Elastic License 2.0 or the Server',
  ' * Side Public License, v 1.',
  ' */',
];

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ['**/*.{js,cjs}'],
    ...tseslint.configs.disableTypeChecked,
    languageOptions: {
      globals: globals.node,
      parserOptions: {
        projectService: false,
      },
    },
  },
  {
    // `.cjs` is an explicit CommonJS marker; `require(...)` is the point.
    files: ['**/*.cjs'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  {
    files: ['**/*.{ts,tsx,js,cjs}'],
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          args: 'all',
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      curly: ['error', 'all'],
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'simple-import-sort': simpleImportSortPlugin,
    },
    rules: {
      '@typescript-eslint/restrict-template-expressions': [
        'error',
        {
          allow: [
            {
              from: 'file',
              name: [
                'CssToken',
                'ScaleToken',
                'ContextualCssVar',
                'ContextualCssVarName',
              ],
            },
          ],
          allowNumber: true,
        },
      ],
      'simple-import-sort/imports': [
        'error',
        {
          groups: [
            ['^\\u0000'],
            ['^react$', '^@?\\w'],
            ['^@', '^'],
            ['^\\./'],
            ['^.+\\.(module.css|module.scss)$'],
            ['^.+\\.(gif|png|svg|jpg)$'],
          ],
        },
      ],
    },
  },
  {
    files: ['src/**/*.ts'],
    ignores: ['src/**/*.test.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@elastic/distillate', '@elastic/distillate/*'],
              message:
                'Internal source files should import sibling internals with relative paths instead of self-importing package entries.',
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      'src/**/*.{ts,tsx}',
      'docs/examples/**/*.ts',
      'docs/playground/**/*.{ts,tsx}',
      'scripts/**/*.{js,cjs}',
      'eslint.config.js',
      'vitest.config.ts',
    ],
    plugins: {
      'license-header': licenseHeader,
    },
    rules: {
      'license-header/header': ['error', DUAL_LICENSE_HEADER],
    },
  },
  {
    ignores: [
      'dist',
      'node_modules',
      'coverage',
      '.github',
      '.artifacts',
      'docs/reference/api',
      'docs/playground/dist',
    ],
  },
  {
    files: ['**/*.{js,cjs,ts,tsx}'],
    ...prettierRecommended,
  }
);
