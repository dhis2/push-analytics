/* eslint-env node */
module.exports = {
    extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
    parser: '@typescript-eslint/parser',
    plugins: ['@typescript-eslint'],
    root: true,
    rules: {
        '@typescript-eslint/no-var-requires': 'off',
        '@typescript-eslint/consistent-type-imports': 'error',
    },
    env: {
        browser: true,
        node: true,
        es6: true,
    },
}
