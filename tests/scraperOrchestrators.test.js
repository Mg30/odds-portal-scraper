import { expect } from '@jest/globals';
import { nextMatchesScraper, historicScraper } from '../lib/scraperOrchestrators.js';
import launchBrowser from '../lib/browser.js';
import { writeFile, readdir, readFile, mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

describe('scraperOrchestrators Integration Tests', () => {
    let browser;
    let tempDir;

    beforeAll(async () => {
        browser = await launchBrowser();
        tempDir = await mkdtemp(join(tmpdir(), 'orchestrators-test-'));
    }, 60000);

    afterAll(async () => {
        if (browser) {
            await browser.close();
        }
        if (tempDir) {
            await rm(tempDir, { recursive: true, force: true });
        }
    }, 60000);

});
