// eslint-disable-next-line unicorn/prefer-module
module.exports = {
  env: {
    es2021: true,
    node: true
  },
  extends: [
    'standard-with-typescript',
    'prettier',
    'plugin:unicorn/recommended',
    'plugin:sonarjs/recommended'
  ],
  plugins: ['@typescript-eslint', 'prettier', 'unicorn', 'sonarjs'],
  overrides: [
    {
      env: {
        node: true
      },
      files: ['.eslintrc.{js,cjs}'],
      parserOptions: {
        sourceType: 'script',
        project: ['./tsconfig.eslint.json', './tsconfig.json']
      }
    }
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  rules: {
    semi: 0,
    'prettier/prettier': 'error',
    '@typescript-eslint/semi': ['error', 'always'],
    '@typescript-eslint/no-non-null-assertion': 'off',
    '@typescript-eslint/no-misused-promises': 'off',
    'unicorn/no-process-exit': 'off',
    'unicorn/prefer-top-level-await': 'off',
    'unicorn/no-null': 'off'
  }
};
