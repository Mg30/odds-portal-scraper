import { expect } from '@jest/globals';
import { nextMatchesScraper } from '../lib/scrapers.js';
import launchPuppeteer from '../lib/puppeteer.js';
import { writeFile, readdir, readFile, mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

describe('Scrapers Integration Tests', () => {
    let browser;
    let tempDir;

    beforeAll(async () => {
        browser = await launchPuppeteer();
        tempDir = await mkdtemp(join(tmpdir(), 'scrapers-test-'));
    });

    afterAll(async () => {
        await browser.close();

        // Clean up the temporary directory
        await rm(tempDir, { recursive: true, force: true });
    });

    it('should scrape next matches and write them as JSON files', async () => {
        const mockCallback = async (data, index) => {
            const filePath = join(tempDir, `match-${index + 1}.json`);
            await writeFile(filePath, JSON.stringify(data, null, 2));
        };

        await nextMatchesScraper(browser, 'liga-portugal', 'eu', mockCallback);

        // Validate that files were created and contain valid data
        const files = await readdir(tempDir);
        expect(files.length).toBeGreaterThan(0);

        for (const file of files) {
            const filePath = join(tempDir, file);
            const fileContent = JSON.parse(await readFile(filePath, 'utf-8'));

            // Perform validations on the loaded JSON data
            expect(fileContent).toBeDefined();
            expect(fileContent.scrapedAt).toBeDefined();
            expect(fileContent.homeTeam).toBeDefined();
            expect(fileContent.awayTeam).toBeDefined();
            expect(fileContent.date).toBeDefined();

            expect(fileContent.mlFullTime).toBeInstanceOf(Array);
            expect(fileContent.mlFullTime.length).toBeGreaterThan(0);

            expect(fileContent.underOver25).toBeInstanceOf(Array);
            expect(fileContent.underOver25.length).toBeGreaterThan(0);
        }
    }, 60000);
});
