/**
 * WebdriverIO configuration.
 *
 * Points worth being able to explain in an interview:
 *
 *  - WebdriverIO ships its OWN testrunner (@wdio/cli + @wdio/local-runner). It
 *    owns browser sessions, workers and parallelism, and then delegates the
 *    "how tests are written" layer to a framework adapter — here
 *    @wdio/mocha-framework. Swapping that adapter for jasmine or cucumber
 *    changes the test syntax while the runner stays identical.
 *
 *  - `maxInstances` parallelises per spec FILE: each file gets its own worker
 *    process and its own browser session. That only works if specs are
 *    independent, which is why nothing here shares mutable state.
 *
 *  - `waitforTimeout` is the default for every `waitFor*` command. Implicit
 *    waits are deliberately NOT set: they apply to every lookup, interact
 *    unpredictably with explicit waits, and hide real timing problems.
 *
 *  - `specFileRetries` is CI-only. Locally a flake should be seen and fixed,
 *    not silently retried.
 */

const headed = process.env.HEADED === '1';
const isCI = !!process.env.CI;

// WDIO 9 merges runner and capability options into one global config type.
export const config: WebdriverIO.Config = {
    runner: 'local',
    tsConfigPath: './tsconfig.json',

    specs: ['../test/specs/**/*.spec.ts'],

    suites: {
        smoke: ['../test/specs/login.spec.ts'],
        frames: ['../test/specs/frames.spec.ts'],
        dynamic: ['../test/specs/dynamic-loading.spec.ts', '../test/specs/hovers.spec.ts'],
        files: ['../test/specs/file-transfer.spec.ts'],
        shadow: ['../test/specs/shadow-dom.spec.ts'],
    },

    maxInstances: isCI ? 3 : 5,
    baseUrl: 'https://the-internet.herokuapp.com',

    capabilities: [
        {
            browserName: 'chrome',
            'goog:chromeOptions': {
                args: [
                    ...(headed ? [] : ['--headless=new']),
                    '--disable-gpu',
                    '--no-sandbox',
                    '--window-size=1440,900',
                ],
                prefs: {
                    'download.default_directory': `${process.cwd()}/test/downloads`,
                    'download.prompt_for_download': false,
                },
            },
            acceptInsecureCerts: true,

            /**
             * W3C WebDriver defaults this to "dismiss and notify", so the
             * browser closes a native dialog on the next command — before a
             * test can read its text. Symptom: "no such alert" on a page that
             * demonstrably opened one.
             *
             * "ignore" leaves dialogs open so the test owns them explicitly,
             * which is what any suite that asserts on alerts needs.
             */
            'unhandledPromptBehavior': 'ignore',
        },
    ],

    logLevel: 'error',
    bail: 0,
    waitforTimeout: 10_000,
    connectionRetryTimeout: 90_000,
    connectionRetryCount: 3,

    specFileRetries: isCI ? 1 : 0,
    specFileRetriesDelay: 10,
    specFileRetriesDeferred: true,

    framework: 'mocha',
    mochaOpts: {
        ui: 'bdd',
        timeout: 90_000,
    },

    reporters: [
        'spec',
        [
            'allure',
            {
                outputDir: 'allure-results',
                disableWebdriverStepsReporting: false,
                disableWebdriverScreenshotsReporting: false,
            },
        ],
    ],

    /** Screenshot on failure only — green runs should not produce artefacts. */
    afterTest: async function (_test, _context, { passed }) {
        if (!passed) {
            await browser.takeScreenshot();
        }
    },
};
