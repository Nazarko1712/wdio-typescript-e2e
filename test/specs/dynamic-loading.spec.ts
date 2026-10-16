import { expect } from '@wdio/globals';
import { dynamicPage, dynamicControlsPage } from '../pageobjects/dynamic.page.js';

describe('Dynamic rendering', () => {
    it('waits for an element that is injected after the action', async () => {
        await dynamicPage.open();
        await dynamicPage.start();

        expect(await dynamicPage.waitForResult()).toBe('Hello World!');
    });

    it('the element does not exist before the action', async () => {
        await dynamicPage.open();

        // Proving absence is what makes the wait above meaningful: this is the
        // ABSENT case, not the hidden one, so waitForExist is the real gate.
        await expect(dynamicPage.finishText).not.toBeExisting();
    });

    it('a pre-action snapshot cannot see the late element', async () => {
        await dynamicPage.open();

        // $$ resolves immediately against the current DOM. Taken here it is an
        // empty array, and it stays empty no matter what renders afterwards —
        // the exact bug that produces "cannot read properties of undefined".
        const before = await $$('#finish').getElements();
        expect(before).toHaveLength(0);

        await dynamicPage.start();
        await dynamicPage.waitForResult();

        // Re-querying is what returns the node. The old snapshot is not updated.
        const after = await $$('#finish').getElements();
        expect(after).toHaveLength(1);
        expect(before).toHaveLength(0);
    });
});

describe('Dynamic controls', () => {
    beforeEach(async () => {
        await dynamicControlsPage.open();
    });

    it('removes a checkbox from the DOM after a delay', async () => {
        await expect(dynamicControlsPage.checkbox).toBeExisting();

        await dynamicControlsPage.removeCheckbox();

        await expect(dynamicControlsPage.checkbox).not.toBeExisting();
        await expect(dynamicControlsPage.checkboxMessage).toHaveText("It's gone!");
    });

    it('enables an input that starts disabled', async () => {
        // Visible but not interactable: the distinction waitForDisplayed misses.
        await expect(dynamicControlsPage.textInput).toBeDisplayed();
        await expect(dynamicControlsPage.textInput).not.toBeEnabled();

        await dynamicControlsPage.enableInput();

        await expect(dynamicControlsPage.textInput).toBeEnabled();
        await dynamicControlsPage.textInput.setValue('now editable');
        await expect(dynamicControlsPage.textInput).toHaveValue('now editable');
    });

    it('refuses to type into a disabled input', async () => {
        await expect(dynamicControlsPage.textInput).not.toBeEnabled();

        // The lesson: an element can pass every visibility check and still
        // reject interaction. Asserting the disabled state is more honest than
        // clicking and racing the no-op.
        await expect(dynamicControlsPage.textInput.setValue('nope')).rejects.toThrow();
    });
});
