import logger from "./logger.js";
import { getHistoricUrls, getUrlFrom } from "./utils.js";
import { scrapeOdds, scrapeOddsHistoric } from "./scrapers.js";

/**
 * Scrapes odds data for historic matches from each championship URL.
 *
 * @param {import('playwright').Browser} browser - The Playwright browser object.
 * @param {string} leagueName - The name of the league to scrape.
 * @param {number} startYear - The start year for historic data.
 * @param {number} endYear - The end year for historic data.
 * @param {string} oddsFormat - The desired odds format.
 * @param {function} callback - The callback function that handles writing data to different storage.
 * @returns {Promise<void>}
 */
async function historicScraper(browser, leagueName, startYear, endYear, oddsFormat, callback) {
    const historicUrls = getHistoricUrls(leagueName, startYear, endYear);

    try {
        const promises = historicUrls.map(async url => {
            logger.info(`Starting scrape for: ${url}`);
            const page = await browser.newPage(); // Use browser.newPage() directly
            await page.setViewportSize({ width: 1800, height: 2500 });
            await page.goto(url, { waitUntil: 'domcontentloaded' });
            try {
                // await scrapeOddsHistoric(page, oddsFormat, callback, leagueName);
                for await (const { data, fileName } of scrapeOddsHistoric(page, oddsFormat, leagueName)) {
                    await callback(data, fileName);
                }
            } finally {
                await page.close(); // Ensure individual pages are closed
            }
        });

        const results = await Promise.allSettled(promises);

        const errors = results.filter(result => result.status === 'rejected');
        if (errors.length > 0) logger.error(JSON.stringify(errors));
    } catch (error) {
        logger.error(`Error during historic scraping: ${error}`);
        throw error; // Re-throw to be caught by the command
    }
}

/**
 * Scrapes the next matches' odds for a given league using the specified odds format.
 *
 * @param {import('playwright').Browser} browser - The browser instance used to create a new page.
 * @param {string} leagueName - The name of the league to scrape matches from.
 * @param {string} oddsFormat - The desired odds format (e.g., "EU", "US", etc.).
 * @param {function} callback - The callback function that handles writing data to different storage.
 * @param {number} [limit] - Optional limit for the number of matches to scrape.
 */
async function nextMatchesScraper(browser, leagueName, oddsFormat, callback, limit) {
    const baseUrl = getUrlFrom(leagueName);
    let page; // Declare page here to close it in finally

    try {
        page = await browser.newPage(); // Creates a page with its own context by default
        await page.setViewportSize({ width: 1800, height: 2555 });
        logger.info(baseUrl); // Changed from console.log to logger.info
        await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
        // await scrapeOdds(page, oddsFormat, callback, leagueName);
        for await (const { data, fileName } of scrapeOdds(page, oddsFormat, leagueName, limit)) {
            await callback(data, fileName);
        }
    } catch (error) {
        logger.error(`Error during next matches scraping: ${error}`);
        throw error; // Re-throw to be caught by the command
    } finally {
        if (page && !page.isClosed()) {
            await page.close(); // Ensure page is closed
        }
    }
}

export { historicScraper, nextMatchesScraper };
