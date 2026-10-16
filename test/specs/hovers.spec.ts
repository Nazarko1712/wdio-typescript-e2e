import { expect } from '@wdio/globals';
import HoversPage from '../pageobjects/hovers.page.js';

describe('Hover-revealed content', () => {
    beforeEach(async () => {
        await HoversPage.open();
    });

    it('the caption exists in the DOM but is not displayed', async () => {
        // The distinction the whole spec is about: present, yet invisible.
        await expect(HoversPage.caption(0)).toBeExisting();
        await expect(HoversPage.caption(0)).not.toBeDisplayed();
    });

    it('reveals the caption on hover', async () => {
        await HoversPage.revealCaption(0);

        await expect(HoversPage.caption(0)).toBeDisplayed();
        await expect(HoversPage.captionHeading(0)).toHaveText('name: user1');
    });

    it('hovers each figure independently', async () => {
        for (const index of [0, 1, 2]) {
            await HoversPage.revealCaption(index);
            await expect(HoversPage.captionHeading(index)).toHaveText(`name: user${index + 1}`);
        }
    });

    it('exposes a working profile link only while hovered', async () => {
        await HoversPage.revealCaption(1);

        const link = HoversPage.profileLink(1);
        await expect(link).toBeDisplayed();
        expect(await link.getAttribute('href')).toContain('/users/2');

        await link.click();
        await expect(browser).toHaveUrl(expect.stringContaining('/users/2'));
    });
});
