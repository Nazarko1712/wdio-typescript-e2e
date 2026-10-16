import { expect } from '@wdio/globals';
import FramesPage from '../pageobjects/frames.page.js';

describe('Iframes', () => {
    beforeEach(async () => {
        await FramesPage.open();
    });

    it('writes into an editor that lives inside an iframe', async () => {
        await FramesPage.replaceEditorText('Written from inside the frame');

        expect(await FramesPage.readEditorText()).toBe('Written from inside the frame');
    });

    it('cannot see frame content from the top document', async () => {
        // The element exists in the DOM, just not in THIS browsing context.
        // Proving the negative is what makes the context switch meaningful.
        await expect(FramesPage.editorBody).not.toBeExisting();
    });

    it('cannot see top-document content while inside the frame', async () => {
        await FramesPage.inEditor(async () => {
            await expect(FramesPage.pageHeading).not.toBeExisting();
        });
    });

    it('restores the top context even when the action throws', async () => {
        // This is the guarantee the finally block exists for: a failing
        // assertion inside a frame must not leave the next test stranded.
        await expect(
            FramesPage.inEditor(async () => {
                throw new Error('simulated failure inside the frame');
            }),
        ).rejects.toThrow('simulated failure inside the frame');

        // Context is back at the top, so the heading is reachable again.
        await expect(FramesPage.pageHeading).toBeDisplayed();
    });

    it('handles nested frames by switching one level at a time', async () => {
        await browser.url('/nested_frames');

        const topFrame = await $('frame[name="frame-top"]');
        await browser.switchFrame(topFrame);
        try {
            // Inside frame-top there are three more frames: left, middle, right.
            const middle = await $('frame[name="frame-middle"]');
            await browser.switchFrame(middle);
            try {
                expect(await $('#content').getText()).toBe('MIDDLE');
            } finally {
                await browser.switchFrame(null);
                await browser.switchFrame(await $('frame[name="frame-top"]'));
            }

            const left = await $('frame[name="frame-left"]');
            await browser.switchFrame(left);
            try {
                expect(await $('body').getText()).toBe('LEFT');
            } finally {
                await browser.switchFrame(null);
            }
        } finally {
            await browser.switchFrame(null);
        }
    });
});
