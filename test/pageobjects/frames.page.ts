import { BasePage } from './base.page.js';

/**
 * Frame handling.
 *
 * The rule that catches people out: element lookups are scoped to the CURRENT
 * frame. After `switchToFrame` every `$()` searches inside that frame only, and
 * the context stays switched until you move it back. The classic bug is a test
 * that enters a frame, passes, and leaves the context there — the NEXT test
 * then fails looking for a top-level element that is perfectly present.
 *
 * Which is why every helper here restores the context in `finally`, so even a
 * failing assertion cannot leak frame state into the following test.
 */
class FramesPage extends BasePage {
    protected readonly path = '/iframe';

    get editorFrame(): ChainablePromiseElement {
        return $('#mce_0_ifr');
    }

    /** Lives INSIDE the iframe — unreachable until the context is switched. */
    get editorBody(): ChainablePromiseElement {
        return $('#tinymce');
    }

    /** Lives OUTSIDE the iframe, in the top-level document. */
    get pageHeading(): ChainablePromiseElement {
        return $('h3');
    }

    /**
     * Run `action` inside the editor iframe and always return to the top
     * document, whatever happens.
     */
    async inEditor<T>(action: () => Promise<T>): Promise<T> {
        await this.editorFrame.waitForExist({ timeout: 10_000 });
        await browser.switchFrame(await this.editorFrame.getElement());
        try {
            return await action();
        } finally {
            await browser.switchFrame(null); // null = back to the top document
        }
    }

    /**
     * The TinyMCE body is a `contenteditable` element, NOT an input. That means
     * `setValue` and `clearValue` silently do nothing — they drive the `value`
     * property, which a contenteditable does not have. The symptom is a test
     * that passes the write step and then reads back an empty string.
     *
     * The working combination: clear the DOM directly, focus the element, then
     * send real keystrokes so the typing path is genuinely exercised.
     */
    async replaceEditorText(text: string): Promise<void> {
        await this.inEditor(async () => {
            await this.editorBody.waitForDisplayed({ timeout: 10_000 });

            const body = await this.editorBody.getElement();
            await browser.execute(
                (el: HTMLElement) => {
                    el.innerHTML = '';
                },
                body as unknown as HTMLElement,
            );

            await body.click();
            await browser.keys(text);

            await this.until(
                async () => (await this.editorBody.getText()).includes(text),
                `editor did not receive the text "${text}"`,
            );
        });
    }

    async readEditorText(): Promise<string> {
        return this.inEditor(async () => {
            await this.editorBody.waitForDisplayed({ timeout: 10_000 });
            return this.editorBody.getText();
        });
    }
}

export default new FramesPage();
