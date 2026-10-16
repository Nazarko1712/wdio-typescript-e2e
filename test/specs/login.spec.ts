import { expect } from '@wdio/globals';
import LoginPage from '../pageobjects/login.page.js';
import { credentials } from '../data/credentials.js';

/**
 * Authentication flow.
 *
 * Note the assertion style: `expect(locator)` matchers from expect-webdriverio
 * RETRY until the expect timeout. The alternative —
 * `expect(await el.getText()).toBe(...)` — samples once and fails on the first
 * read, which is a common source of flakiness on a page that settles late.
 */
describe('Authentication', () => {
    beforeEach(async () => {
        await LoginPage.open();
    });

    it('signs in with valid credentials', async () => {
        await LoginPage.login(credentials.valid.username, credentials.valid.password);

        await expect(LoginPage.logoutLink).toBeDisplayed();
        expect(await LoginPage.flashText()).toContain('You logged into a secure area');
        await expect(browser).toHaveUrl(expect.stringContaining('/secure'));
    });

    it('rejects an unknown username', async () => {
        await LoginPage.login('not-a-real-user', credentials.valid.password);

        expect(await LoginPage.flashText()).toContain('Your username is invalid');
        await expect(LoginPage.logoutLink).not.toBeExisting();
    });

    it('rejects a wrong password', async () => {
        await LoginPage.login(credentials.valid.username, 'wrong-password');

        expect(await LoginPage.flashText()).toContain('Your password is invalid');
    });

    /**
     * Security-relevant observation, not a style nit: this application returns
     * a DIFFERENT message for an unknown username than for a wrong password.
     * That is user enumeration — an attacker can discover which accounts exist
     * by reading the error text alone. A hardened login returns one identical
     * message for both cases.
     *
     * The test asserts the current behaviour so the suite stays honest, and
     * documents the finding rather than quietly accepting it.
     */
    it('documents that error messages distinguish user from password (enumeration)', async () => {
        await LoginPage.login('definitely-not-a-user', 'whatever');
        const unknownUser = await LoginPage.flashText();

        await LoginPage.open();
        await LoginPage.login(credentials.valid.username, 'whatever');
        const wrongPassword = await LoginPage.flashText();

        expect(unknownUser).not.toEqual(wrongPassword);
    });

    it('signs out and blocks the secure area afterwards', async () => {
        await LoginPage.login(credentials.valid.username, credentials.valid.password);
        await LoginPage.clickLogout();

        expect(await LoginPage.flashText()).toContain('You logged out of the secure area');

        await browser.url('/secure');
        expect(await LoginPage.flashText()).toContain('You must login to view the secure area');
    });
});
