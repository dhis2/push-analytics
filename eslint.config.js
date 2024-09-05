/* eslint-env node */
const eslint = require('@eslint/js')
const tseslint = require('typescript-eslint')
const globals = require('globals')

module.exports = tseslint.config(
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    {
        languageOptions: {
            ecmaVersion: 6,
            parserOptions: {
                project: './tsconfig.eslint.json',
            },
            globals: {
                ...globals.browser,
                ...globals.node,
            },
        },
        plugins: { tseslint: tseslint.plugin },
        rules: {
            '@typescript-eslint/no-var-requires': 'off',
            '@typescript-eslint/consistent-type-imports': 'error',
            '@typescript-eslint/no-floating-promises': 'error',
            'require-await': 'error',
        },
    },
    {
        files: ['**/*.e2e.ts', '**/*.test.ts'],
        rules: {
            '@typescript-eslint/no-floating-promises': 'off',
        },
    },
    {
        files: ['eslint.config.js', 'prettierrc.js'],
        rules: {
            '@typescript-eslint/no-require-imports': 'off',
        },
    }
)
