import launchPuppeteer from '../lib/puppeteer.js';
import { anonymizeProxy } from 'proxy-chain';
import { jest } from '@jest/globals';

describe('StealthBrowser', () => {
    let browser;

    afterEach(async () => {
        if (browser) {
            await browser.cleanup();
        }
    });

    it('should initialize browser with default configuration', async () => {
        browser = await launchPuppeteer();

        expect(browser).toBeDefined();
    });

    it('should use proxy configuration if provided', async () => {
        browser = await launchPuppeteer({ proxy: 'http://test-proxy' });
        expect(browser.config.proxy).toBe('http://test-proxy');

    });

    it('should create a new page with user agent and configurations', async () => {
        browser = await launchPuppeteer();
        const page = await browser.newPage();

        expect(page).toBeDefined();
    });

    it('should close all pages and browser during cleanup', async () => {
        browser = await launchPuppeteer();
        const page = await browser.newPage();
        await browser.cleanup();

        expect(page.isClosed()).toBe(true);
    });
});
