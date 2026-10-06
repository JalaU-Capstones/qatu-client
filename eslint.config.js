import js from '@eslint/js';
import prettierConfig from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    files: ['src/**/*.js'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.jasmine,
        console: 'readonly',
      },
    },
    plugins: {
      import: importPlugin,
    },
    rules: {
      'no-console': 'warn',
      'no-unused-vars': 'error',
      'import/order': [
        'error',
        {
          alphabetize: { order: 'asc' },
        },
      ],
    },
  },
  {
    ignores: [
      'node_modules/',
      'dist/',
      'coverage/',
      '.docs/',
      '.husky/',
      '.github/',
      '.pnpm-store/',
    ],
  },
  prettierConfig,
];
