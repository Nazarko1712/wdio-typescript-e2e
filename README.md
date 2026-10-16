# wdio-typescript-e2e

WebdriverIO 9 + TypeScript E2E suite built around the interaction patterns that
actually break in real projects — iframes, late rendering, disabled controls,
hover-gated content, file transfer and shadow DOM — rather than another
login-and-add-to-cart walkthrough.

**29 tests, 6 spec files, 6 parallel workers, ~27s.** Target:
[the-internet.herokuapp.com](https://the-internet.herokuapp.com).

## Prerequisites

| Requirement        | Notes                                                                                                                              |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Node.js 22**     | pinned in `.nvmrc`. WebdriverIO 9 dependencies require ≥ 20.18.1 — on 20.11 the install warns `EBADENGINE` and can fail at runtime |
| **Chrome**         | WebdriverIO 9 downloads a matching Chrome for Testing and driver automatically; nothing to install by hand                         |
| **Network access** | `the-internet.herokuapp.com`                                                                                                       |
| **Allure CLI**     | only for `npm run report`; the suite itself just writes `allure-results/`                                                          |

No Docker, no local services, no seeded database.

## Setup

```bash
nvm use     # or: nvm install 22
npm ci      # exact lockfile install
```

## Running

**Headless** — the default, and what CI runs:

```bash
npm test              # all 6 specs, 5 parallel workers
npm run test:smoke    # authentication only
npm run test:frames   # iframes
npm run test:dynamic  # late rendering and delayed controls
npm run test:files    # upload
```

**Headed** — watch the browser:

```bash
npm run test:headed   # all specs, visible browser
HEADED=1 npx wdio run ./config/wdio.conf.ts --suite smoke
```

Headedness is driven by the `HEADED` environment variable rather than a CLI
flag: it controls `--headless=new` in `goog:chromeOptions`, which is a browser
launch argument and therefore belongs to the capability, not to the runner.

A single spec, either mode:

```bash
npx wdio run ./config/wdio.conf.ts --spec test/specs/frames.spec.ts
HEADED=1 npx wdio run ./config/wdio.conf.ts --spec test/specs/hovers.spec.ts
```

Other:

```bash
npm run typecheck     # tsc --noEmit, strict
npm run report        # generate and open the Allure report
```

## Layout

```
config/wdio.conf.ts        runner, suites, capabilities, retry policy
test/pageobjects/
  base.page.ts             conventions: getters, no assertions, no sleeps
  login.page.ts
  frames.page.ts
  dynamic.page.ts
  hovers.page.ts
  upload.page.ts
test/specs/                one spec per interaction pattern
test/data/credentials.ts   env-overridable, never hard-coded in a spec
```

## Coverage

| Spec              | Tests | Pattern                                                    |
| ----------------- | ----- | ---------------------------------------------------------- |
| `login`           | 5     | auth flow, negative cases, **user enumeration**            |
| `frames`          | 5     | iframe context, nested frames, context restoration         |
| `dynamic-loading` | 6     | late-injected elements, disabled controls, stale snapshots |
| `hovers`          | 4     | exists-vs-displayed, hover-gated content                   |
| `file-transfer`   | 4     | upload, unicode names, large files, empty submit           |
| `shadow-dom`      | 5     | shadow boundaries, `shadow$`, deep selectors               |

## Conventions, and why

**Selectors are getters on a page object, never in a spec.** A getter re-queries
on every access, so an element reference cannot be a snapshot taken earlier in
the test. Markup changes are fixed in one place.

**Page objects expose actions and queries, never assertions.** The page object
describes what _can be done_; the expectation belongs to the test. A shared
object that asserts starts dictating what every test must believe.

**Every wait is explicit and on a condition.** There is no implicit wait
configured and no fixed sleep in this repository. A `sleep` is either too short
(the test fails) or too long (the suite crawls) — and it is always a sign that
the real condition was never identified.

**`waitForDisplayed` is not enough before a click.** An element can be visible
and still refuse interaction because something overlays it or it is disabled.
Actions go through `clickWhenReady`, which waits for clickability.

**Web-first assertions.** `expect(locator).toHaveText(...)` retries until the
timeout; `expect(await el.getText()).toBe(...)` samples once and fails on the
first read. The second form is a common source of flakiness on a page that
settles late.

**Specs are independent.** Nothing shares mutable state, which is what makes
`maxInstances` meaningful — each spec file gets its own worker and its own
browser session.

## Findings worth reading

These are real problems hit while writing this suite, kept in the code with the
mechanism explained rather than quietly patched.

### `setValue` silently does nothing on `contenteditable`

The TinyMCE body inside the iframe is a `contenteditable` element, not an input.
`setValue` and `clearValue` drive the `value` property, which a contenteditable
does not have — so the write step **passes** and the read-back returns an empty
string. Working combination: clear the DOM directly, focus, send real keystrokes.

### Frame context leaks into the next test

Element lookups are scoped to the current frame, and the context stays switched
until moved back. The classic bug is a test that enters a frame, passes, and
leaves the context there — the _next_ test then fails looking for a top-level
element that is plainly present. Every frame helper here restores the context in
`finally`, and `frames.spec.ts` has a test that throws inside a frame on purpose
to prove the guarantee holds.

### A `$$` snapshot cannot see a late element

`$$` resolves immediately against the current DOM. Captured before the render it
is an empty array, and it stays empty no matter what appears afterwards — the
origin of "cannot read properties of undefined". `dynamic-loading.spec.ts`
asserts both halves: the stale snapshot stays empty while a fresh query returns
the node.

### `nth-of-type` counts tags, not classes

`.figure:nth-of-type(3)` does not mean "the third figure". It means "an element
matching `.figure` that is also the third element of its tag among siblings".
The first version of `hovers.page.ts` was off by two because of this.

### WebdriverIO 9 pierces shadow roots by default

Ordinary selectors resolve through shadow boundaries in v9, which v8 and raw
Selenium do not. Convenient, but it means "the selector found nothing" can no
longer prove a boundary exists — and a selector migrated from v8 silently widens
its reach. Documented in `shadow-dom.spec.ts` rather than worked around.

### Upload paths are resolved on the browser's machine

`setValue` on a file input needs a path that exists where the **browser** runs.
Locally that is the same machine, so an absolute path works and everyone writes
it that way; on a Selenium Grid the browser node has no checkout of the repo and
the upload fails — green locally, red in CI, with a log that does not explain
why. `browser.uploadFile()` transfers the file to the node first and returns the
path as seen from there. Negligible overhead locally, mandatory remotely.

### The target leaks which accounts exist

The application returns a different message for an unknown username than for a
wrong password, so the error text alone reveals which accounts exist — user
enumeration. A hardened login returns one identical message for both. The suite
asserts the current behaviour so it stays honest, and documents the finding.

## What is deliberately not automated

**Native JavaScript dialogs** (`alert`, `confirm`, `prompt`).

ChromeDriver 155 handles the dialog within the `click()` command regardless of
`unhandledPromptBehavior: 'ignore'` — verified by dumping the negotiated session
capabilities and confirming the page-side handler had already run while
`getAlertText()` reported _no such alert_. The behaviour is non-deterministic:
the same spec passed one run and failed the next, in both headless and headed
mode.

A knowingly flaky spec is worse than no spec. It teaches the team to re-run
without looking, and once that habit exists a real regression passes unnoticed.
So the coverage is dropped and the reason recorded here, which is also how a
blocked test should be handled on a real project — removed from the run, with
the cause written down, rather than left red or silently skipped.

## Notes on the stack

WebdriverIO ships its **own testrunner** (`@wdio/cli` + `@wdio/local-runner`): it
owns browser sessions, worker processes and parallelism, then delegates the
"how tests are written" layer to a framework adapter. This project uses
`@wdio/mocha-framework`; swapping that adapter for `jasmine` or `cucumber`
changes the test syntax while the runner stays identical.

`tsconfig.json` includes the `DOM` lib because `browser.execute` callbacks run
**in the page** and legitimately reference `HTMLElement` and `document`, even
though the surrounding test code runs in Node.

`specFileRetries` is CI-only. Locally a flake should be seen and fixed, not
silently retried.

## Linting and reports

```bash
npm run lint          # ESLint 9, flat config, type-checked rules
npm run lint:fix
npm run format        # Prettier, writes
npm run format:check  # Prettier, reports (this is what CI runs)
npm run typecheck     # tsc --noEmit
npm run report        # generate and open the Allure report
```

| Rule                | What it catches                                                                                                             |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `wdio/await-expect` | a missing `await` on an `expect-webdriverio` assertion leaves a pending Promise and the test passes having asserted nothing |
| `wdio/no-pause`     | `browser.pause(3000)` instead of `waitUntil` — slower on a fast machine and still flaky on a slow one                       |
| `wdio/no-debug`     | a leftover `browser.debug()` blocks CI until the job timeout                                                                |

### `await $(...)` is unnecessary in WebdriverIO 9, and the types say so

Fifteen `await-thenable` errors turned out to be one fact.
`ChainablePromiseElement` no longer extends `Promise` in v9, so `await $('x')` is
statically an await of a non-thenable: it works at runtime (the object really
does have a `then`), but the resulting type is the chainable, not the element.

For `$$` that is not merely cosmetic. `ChainablePromiseArray.length` is typed
`Promise<number>`, so:

```ts
const items = await $$('li');
expect(items.length).toBeGreaterThan(0); // comparing a Promise, statically
```

v9's answer is explicit accessors, and the whole suite now uses them:

```ts
const host = await $('my-paragraph').getElement(); // WebdriverIO.Element
const items = await $$('>>> li').getElements(); // ElementArray, real .length
```

One `require-await` disable remains, in `frames.spec.ts`, with its reason: the
`async` on the callback passed to `inEditor` is load-bearing, because a
synchronous throw would escape before the `try/finally` is entered and the frame
context would never be restored — which is the exact behaviour that test asserts.

### Reports

Allure, via `@wdio/allure-reporter`: `npm run report` generates and opens it.
Allure rather than a bare spec reporter because this suite's value is in the
_documented findings_, and Allure attaches a screenshot and the step breakdown to
each one.

### Where this runs in CI

Linting and formatting are their **own job**, not steps inside the test job.
They need no browser, no network and no secrets, and they finish in seconds, so
as a separate job they run concurrently with the suite: a formatting failure
does not wait behind a long test run, and a real test failure is not hidden
behind a formatting failure. Both verdicts arrive on their own.

CI runs the `--check` variants, never the formatter itself. A pipeline reports
on the branch it was asked to verify; it does not rewrite it.
