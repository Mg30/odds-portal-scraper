import { expect } from '@jest/globals';
import { nextMatchesScraper } from '../lib/scraperOrchestrators.js';
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

    it('should scrape next matches using orchestrator and write JSON files', async () => {
        const mockCallback = async (data, fileName) => {
            const filePath = join(tempDir, fileName);
            await writeFile(filePath, JSON.stringify(data, null, 2));
        };

        // Limit to 1 match for test performance
        await nextMatchesScraper(browser, 'liga', 'eu', mockCallback, 3);

        const files = await readdir(tempDir);
        expect(files.length).toBeGreaterThan(0);
        for (const file of files) {
            const filePath = join(tempDir, file);
            const fileContent = JSON.parse(await readFile(filePath, 'utf-8'));
            expect(fileContent).toBeDefined();
            expect(fileContent.scrapedAt).toBeDefined();
            expect(fileContent.homeTeam).toBeDefined();
            expect(fileContent.awayTeam).toBeDefined();
            expect(fileContent.date).toBeDefined();
            expect(fileContent.mlFullTime).toBeInstanceOf(Array);
            expect(fileContent.underOver25).toBeInstanceOf(Array);
        }
    }, 60000); // 30 seconds timeout
});
