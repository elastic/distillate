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

import js from '@eslint/js';
import licenseHeader from 'eslint-plugin-license-header';
import prettierRecommended from 'eslint-plugin-prettier/recommended';
import simpleImportSortPlugin from 'eslint-plugin-simple-import-sort';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const APACHE_HEADER = [
  '/*',
  ' * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one',
  ' * or more contributor license agreements. See the NOTICE file distributed with',
  ' * this work for additional information regarding copyright',
  ' * ownership. Elasticsearch B.V. licenses this file to you under',
  ' * the Apache License, Version 2.0 (the "License"); you may',
  ' * not use this file except in compliance with the License.',
  ' * You may obtain a copy of the License at',
  ' *',
  ' *\thttp://www.apache.org/licenses/LICENSE-2.0',
  ' *',
  ' * Unless required by applicable law or agreed to in writing,',
  ' * software distributed under the License is distributed on an',
  ' * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY',
  ' * KIND, either express or implied.  See the License for the',
  ' * specific language governing permissions and limitations',
  ' * under the License.',
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
      'scripts/**/*.js',
      'eslint.config.js',
      'vitest.config.ts',
    ],
    plugins: {
      'license-header': licenseHeader,
    },
    rules: {
      'license-header/header': ['error', APACHE_HEADER],
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
