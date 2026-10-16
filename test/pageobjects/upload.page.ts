import { BasePage } from './base.page.js';

/**
 * File upload.
 *
 * The part that matters in a real pipeline: `setValue` on a file input needs a
 * path that exists ON THE MACHINE RUNNING THE BROWSER. Locally that is the same
 * machine, so a plain absolute path works and everyone writes it that way.
 *
 * On a Selenium Grid the browser runs on a different node which has no checkout
 * of the repository, so that absolute path resolves to nothing and the upload
 * fails — a test that is green locally and red in CI for reasons the log does
 * not explain.
 *
 * `browser.uploadFile()` is the fix: it transfers the file to the node first
 * and returns the path as seen from there. It is a no-op overhead locally and
 * mandatory remotely, so this suite always uses it.
 */
class UploadPage extends BasePage {
    protected readonly path = '/upload';

    get fileInput(): ChainablePromiseElement {
        return $('#file-upload');
    }

    get submitButton(): ChainablePromiseElement {
        return $('#file-submit');
    }

    get uploadedName(): ChainablePromiseElement {
        return $('#uploaded-files');
    }

    get heading(): ChainablePromiseElement {
        return $('h3');
    }

    async uploadFile(localPath: string): Promise<void> {
        const remotePath = await browser.uploadFile(localPath);
        await this.fileInput.setValue(remotePath);
        await this.clickWhenReady(this.submitButton);
    }

    async uploadedFileName(): Promise<string> {
        await this.uploadedName.waitForDisplayed({ timeout: 15_000 });
        return (await this.uploadedName.getText()).trim();
    }
}

export default new UploadPage();
