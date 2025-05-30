import launchBrowser from '../lib/browser.js';

describe('StealthBrowser', () => {
    let browser;

    afterEach(async () => {
        if (browser) {
            await browser.cleanup();
        }
    });

    it('should initialize browser with default configuration', async () => {
        browser = await launchBrowser();

        expect(browser).toBeDefined();
    });

    it('should use proxy configuration if provided', async () => {
        browser = await launchBrowser({ proxy: 'http://test-proxy' });
        expect(browser.config.proxy).toBe('http://test-proxy');

    });

    it('should create a new page with user agent and configurations', async () => {
        browser = await launchBrowser();
        const page = await browser.newPage();

        expect(page).toBeDefined();
    });

    it('should close all pages and browser during cleanup', async () => {
        browser = await launchBrowser();
        const page = await browser.newPage();
        await browser.cleanup();

        expect(page.isClosed()).toBe(true);
    });
});
