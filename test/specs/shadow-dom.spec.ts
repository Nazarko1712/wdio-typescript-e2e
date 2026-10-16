import { expect } from '@wdio/globals';

/**
 * Shadow DOM.
 *
 * A shadow root is a separate DOM tree attached to a host element. Ordinary
 * selectors stop at the boundary: `$('#inside-the-shadow')` finds nothing, even
 * though the node is plainly visible on screen. This is the same class of
 * problem as an iframe — content that exists but lives in another tree — except
 * there is no context to switch, so it is easy to misread as "element missing".
 *
 * WebdriverIO offers two explicit ways through:
 *   `element.shadow$()`  — one boundary at a time
 *   `$('>>> selector')`  — deep selector, pierces any number of boundaries
 *
 * IMPORTANT behaviour change: WebdriverIO 9 pierces shadow roots with ORDINARY
 * selectors by default, which WebdriverIO 8 and raw Selenium do not. Convenient
 * in daily use, but it has a consequence for test design — "the selector found
 * nothing" can no longer be used to prove that a shadow boundary exists, and a
 * selector written against v8 behaviour may now match more than intended.
 *
 * The explicit forms are still preferred here because they document WHERE the
 * boundary is, which an implicit pierce hides.
 */
describe('Shadow DOM', () => {
    beforeEach(async () => {
        await browser.url('/shadowdom');
    });

    it('an ordinary selector already pierces the shadow root in WDIO 9', async () => {
        const host = await $('my-paragraph').getElement();
        await expect(host).toBeExisting();

        // The slot lives in the SHADOW tree. Under WebdriverIO 8 or raw
        // Selenium this query would find nothing; v9 resolves it anyway.
        //
        // Documented rather than worked around, because the difference bites
        // when migrating a v8 suite: selectors silently widen their reach.
        await expect($('slot[name="my-text"]')).toBeExisting();
    });

    it('reaches shadow content with shadow$', async () => {
        const host = await $('my-paragraph').getElement();
        const slot = await host.shadow$('slot[name="my-text"]').getElement();

        await expect(slot).toBeExisting();
    });

    it('reaches shadow content with the deep selector', async () => {
        const deep = await $('>>> slot[name="my-text"]').getElement();

        await expect(deep).toBeExisting();
    });

    it('reads slotted light-DOM text projected into the shadow tree', async () => {
        // Slotted content is authored in the LIGHT dom and merely rendered
        // through the shadow tree, so it stays reachable from the top level.
        const hosts = await $$('my-paragraph').getElements();
        expect(hosts.length).toBeGreaterThan(0);

        const text = await hosts[0]!.getText();
        expect(text.length).toBeGreaterThan(0);
    });

    it('finds list items rendered inside the shadow tree', async () => {
        const items = await $$('>>> li').getElements();

        expect(items.length).toBeGreaterThan(0);
    });
});
