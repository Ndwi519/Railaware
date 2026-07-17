module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'import'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended-type-checked',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'prettier',
  ],
  parserOptions: {
    project: true,
  },
  rules: {
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'import/no-default-export': 'error',
    'no-console': 'warn',
  },
  overrides: [
    {
      // Next.js requires default exports for pages
      files: ['apps/web/**/*.tsx', 'apps/web/**/*.ts'],
      rules: { 'import/no-default-export': 'off' },
    },
    {
      // Phase 0 / scripts may use console.log intentionally
      files: ['scripts/**/*.ts'],
      rules: { 'no-console': 'off' },
    },
  ],
  settings: {
    'import/resolver': { typescript: { project: ['tsconfig.base.json'] } },
  },
};
