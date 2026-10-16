import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import wdio from 'eslint-plugin-wdio';
import prettier from 'eslint-config-prettier';

/**
 * ESLint 9 flat config.
 *
 * WebdriverIO's own plugin exists for one reason that matters:
 *
 *   wdio/no-pause         `browser.pause(3000)` is a fixed sleep. WebdriverIO
 *                         already ships `waitUntil` and the `waitFor*`
 *                         commands, which wait on the condition instead of on
 *                         the clock — a pause is both slower on a fast machine
 *                         and still flaky on a slow one.
 *   wdio/await-expect     a missing await on `expect(...)` from
 *                         expect-webdriverio leaves a pending Promise and the
 *                         test passes having asserted nothing. This is the
 *                         WebdriverIO-specific form of no-floating-promises
 *                         and it is why the type-checked ruleset is on here
 *                         rather than the plain recommended one.
 *   wdio/no-debug         a leftover `browser.debug()` blocks CI until the
 *                         job's timeout.
 */
export default tseslint.config(
    {
        ignores: [
            'node_modules/',
            'allure-results/',
            'allure-report/',
            'downloads/',
            'eslint.config.mjs',
        ],
    },

    js.configs.recommended,
    ...tseslint.configs.recommendedTypeChecked,

    {
        languageOptions: {
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
        rules: {
            '@typescript-eslint/no-floating-promises': 'error',
            '@typescript-eslint/no-misused-promises': 'error',
            '@typescript-eslint/require-await': 'error',
            '@typescript-eslint/no-unused-vars': [
                'error',
                { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
            ],
        },
    },

    {
        files: ['test/**/*.ts'],
        ...wdio.configs['flat/recommended'],
        rules: {
            ...wdio.configs['flat/recommended'].rules,
            'wdio/no-pause': 'error',
            'wdio/await-expect': 'error',
            'wdio/no-debug': 'error',
        },
    },

    prettier,
);
