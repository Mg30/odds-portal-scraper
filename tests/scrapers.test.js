import { jest } from '@jest/globals';
import { nextMatchesScraper } from '../lib/scrapers.js';
import launchPuppeteer from '../lib/puppeteer.js';

describe('Scrapers Integration Tests', () => {
    let browser;

    beforeAll(async () => {
        browser = await launchPuppeteer();
    });

    afterAll(async () => {
        await browser.close();
    });

    it('should scrape next matches successfully', async () => {
        const mockCallback = jest.fn();
        await nextMatchesScraper(browser, 'liga-portugal', 'eu', mockCallback);
        expect(mockCallback).toHaveBeenCalled();
    }, 60000);
});