const expo = require('eslint-config-expo/flat');
const globals = require('globals');
module.exports = [
  {
    ignores: [
      '**/dist/**',
      '**/test-results/**',
      '**/playwright-report/**',
      '**/.expo/**',
      '**/node_modules/**',
      '**/.turbo/**',
    ],
  },
  ...expo,
  {
    files: ['apps/api/**/*.ts', 'packages/**/*.ts', '**/*.cjs'],
    languageOptions: { globals: globals.node },
    settings: { react: { version: '19.2' } },
  },
];
