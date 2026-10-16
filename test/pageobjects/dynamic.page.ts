import { BasePage } from './base.page.js';

/**
 * Elements that arrive late, and controls that change state late.
 *
 * Two distinct problems that look identical in a failure log:
 *
 *   HIDDEN   — the element is in the DOM from the start, just not displayed.
 *              `waitForExist` passes immediately and tells you nothing;
 *              `waitForDisplayed` is the condition that matters.
 *
 *   ABSENT   — the element is injected into the DOM only after the action.
 *              Here `waitForExist` is the meaningful wait, and any element
 *              reference captured earlier is useless.
 *
 * The second case is why a `$$` snapshot taken before the render goes stale:
 * it resolved against a DOM that did not yet contain the nodes.
 */
class DynamicPage extends BasePage {
    protected readonly path = '/dynamic_loading/2';

    get startButton(): ChainablePromiseElement {
        return $('#start button');
    }

    get loadingIndicator(): ChainablePromiseElement {
        return $('#loading');
    }

    get finishText(): ChainablePromiseElement {
        return $('#finish');
    }

    async start(): Promise<void> {
        await this.clickWhenReady(this.startButton);
    }

    /** Wait for the work to finish, not for a fixed number of seconds. */
    async waitForResult(): Promise<string> {
        await this.loadingIndicator.waitForDisplayed({
            timeout: 15_000,
            reverse: true,
            timeoutMsg: 'loading indicator never disappeared',
        });
        await this.finishText.waitForDisplayed({ timeout: 15_000 });
        return this.finishText.getText();
    }
}

/** Controls that enable, disable, appear and vanish after a delay. */
class DynamicControlsPage extends BasePage {
    protected readonly path = '/dynamic_controls';

    get checkbox(): ChainablePromiseElement {
        return $('#checkbox input');
    }

    get removeOrAddButton(): ChainablePromiseElement {
        return $('#checkbox-example button');
    }

    get checkboxMessage(): ChainablePromiseElement {
        return $('#message');
    }

    get textInput(): ChainablePromiseElement {
        return $('#input-example input');
    }

    get enableOrDisableButton(): ChainablePromiseElement {
        return $('#input-example button');
    }

    async removeCheckbox(): Promise<void> {
        await this.clickWhenReady(this.removeOrAddButton);
        await this.checkbox.waitForExist({
            timeout: 15_000,
            reverse: true,
            timeoutMsg: 'checkbox was never removed from the DOM',
        });
    }

    async enableInput(): Promise<void> {
        await this.clickWhenReady(this.enableOrDisableButton);
        await this.textInput.waitForEnabled({
            timeout: 15_000,
            timeoutMsg: 'input never became enabled',
        });
    }
}

export const dynamicPage = new DynamicPage();
export const dynamicControlsPage = new DynamicControlsPage();
