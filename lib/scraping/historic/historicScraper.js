import logger from "../../logger.js";
import { getHistoricUrls } from "../../utils/leagues.js";
import { collectMatchData } from "../match/index.js";
import { discoverSeasonPages } from "./seasonNavigator.js";

/**
 * Scrapes historic odds for the requested league and season range.
 *
 * @param {import('playwright').Browser} browser
 * @param {string} leagueName
 * @param {number|string} startYear
 * @param {number|string} endYear
 * @param {string} oddsFormat
 * @param {(data: unknown, fileName: string) => Promise<void>} onResult
 */
export async function historicScraper(browser, leagueName, startYear, endYear, oddsFormat, onResult) {
    const seasonUrls = getHistoricUrls(leagueName, startYear, endYear);

    for (const seasonUrl of seasonUrls) {
        let page;

        try {
            page = await browser.newPage();
            await page.setViewportSize({ width: 1800, height: 2500 });

            const pageUrls = await discoverSeasonPages(page, seasonUrl);

            for (const pageUrl of pageUrls) {
                logger.info(`Starting scrape for: ${pageUrl}`);

                await page.goto(pageUrl, { waitUntil: 'domcontentloaded' });

                for await (const { data, fileName } of collectMatchData(page, {
                    leagueName,
                    oddsFormat,
                })) {
                    await onResult(data, fileName);
                }
            }
        } catch (error) {
            logger.error(`Error during historic scraping: ${error}`);
            throw error;
        } finally {
            if (page && !page.isClosed()) {
                await page.close();
            }
        }
    }
}
