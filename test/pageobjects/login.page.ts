import { BasePage } from './base.page.js';

class LoginPage extends BasePage {
    protected readonly path = '/login';

    get username(): ChainablePromiseElement {
        return $('#username');
    }

    get password(): ChainablePromiseElement {
        return $('#password');
    }

    get submit(): ChainablePromiseElement {
        return $('button[type="submit"]');
    }

    get flash(): ChainablePromiseElement {
        return $('#flash');
    }

    get logoutLink(): ChainablePromiseElement {
        return $('a[href="/logout"]');
    }

    async login(user: string, pass: string): Promise<void> {
        await this.typeInto(this.username, user);
        await this.typeInto(this.password, pass);
        await this.clickWhenReady(this.submit);
    }

    async clickLogout(): Promise<void> {
        await this.clickWhenReady(this.logoutLink);
    }

    /** Flash text carries a trailing × from the dismiss button; strip it. */
    async flashText(): Promise<string> {
        await this.flash.waitForDisplayed({ timeout: 10_000 });
        return (await this.flash.getText()).replace(/\s*×\s*$/, '').trim();
    }
}

export default new LoginPage();
