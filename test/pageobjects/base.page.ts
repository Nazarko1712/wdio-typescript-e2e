/**
 * Base page object.
 *
 * Conventions used across this suite, and the reasoning behind them:
 *
 *  - Selectors live here as GETTERS, never in a spec. A getter re-queries on
 *    every access, so the element reference cannot be a stale snapshot taken
 *    earlier in the test.
 *
 *  - Page objects expose ACTIONS and QUERIES, never assertions. The page object
 *    describes what can be done; the expectation belongs to the test, otherwise
 *    a shared object starts dictating what every test must believe.
 *
 *  - Waiting is always explicit and always on a condition. There is no implicit
 *    wait configured and no fixed sleep anywhere in this repository.
 */
export abstract class BasePage {
    /** Path appended to `baseUrl`, e.g. `/iframe`. */
    protected abstract readonly path: string;

    async open(): Promise<void> {
        await browser.url(this.path);
    }

    /**
     * `waitForDisplayed` only proves visibility. An element can be visible and
     * still refuse a click because something overlays it or it is disabled —
     * so actions in this suite wait for clickability, not just display.
     */
    protected async clickWhenReady(element: ChainablePromiseElement): Promise<void> {
        await element.waitForClickable({ timeout: 10_000 });
        await element.click();
    }

    protected async typeInto(element: ChainablePromiseElement, value: string): Promise<void> {
        await element.waitForDisplayed({ timeout: 10_000 });
        await element.setValue(value);
    }

    /**
     * Poll until a predicate holds. Used instead of re-reading a `$$` snapshot,
     * which resolves once and goes stale the moment the list re-renders.
     */
    protected async until(
        predicate: () => Promise<boolean>,
        message: string,
        timeout = 10_000,
    ): Promise<void> {
        await browser.waitUntil(predicate, {
            timeout,
            interval: 250,
            timeoutMsg: message,
        });
    }
}
