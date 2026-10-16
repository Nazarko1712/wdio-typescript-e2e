import { BasePage } from './base.page.js';

/**
 * Content revealed only on hover.
 *
 * The caption is `display: none` until `.figure:hover` applies. That makes it
 * the clearest example of the difference between EXISTS and DISPLAYED: the node
 * is in the DOM from page load, so `waitForExist` passes instantly and proves
 * nothing. Only `waitForDisplayed` reflects what a user can actually see.
 *
 * It is also the shape behind a very common flake: an action is attempted on an
 * element whose parent must be hovered first, the hover is forgotten, and the
 * click lands on whatever is underneath.
 */
class HoversPage extends BasePage {
    protected readonly path = '/hovers';

    /**
     * Three identical figures, selected by zero-based index.
     *
     * `nth-of-type` counts siblings of the same TAG, not of the same class.
     * Here the figures happen to be the only `div` siblings, so they are
     * positions 1-3 — but that is a property of this markup, not a rule. A
     * class-aware `nth-child` filter or a data attribute would be sturdier if
     * the page ever gains another div.
     */
    figure(index: number): ChainablePromiseElement {
        return $(`.figure:nth-of-type(${index + 1})`);
    }

    caption(index: number): ChainablePromiseElement {
        return this.figure(index).$('.figcaption');
    }

    captionHeading(index: number): ChainablePromiseElement {
        return this.caption(index).$('h5');
    }

    profileLink(index: number): ChainablePromiseElement {
        return this.caption(index).$('a');
    }

    async revealCaption(index: number): Promise<void> {
        const figure = this.figure(index);
        await figure.waitForDisplayed({ timeout: 10_000 });
        // scrollIntoView first: a hover on an element outside the viewport is
        // dispatched at the wrong coordinates and silently does nothing.
        await figure.scrollIntoView({ block: 'center' });
        await figure.moveTo();
        await this.caption(index).waitForDisplayed({
            timeout: 10_000,
            timeoutMsg: `caption ${index} never appeared after hover`,
        });
    }
}

export default new HoversPage();
