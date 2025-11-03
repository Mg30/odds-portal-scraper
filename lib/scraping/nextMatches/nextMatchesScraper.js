import logger from "../../logger.js";
import { getUrlFrom } from "../../utils/leagues.js";
import { collectMatchData } from "../match/index.js";
import { gotoWithRetry } from "../shared/gotoWithRetry.js";

const DESKTOP_VIEWPORTS = Object.freeze([
    { width: 1280, height: 720 },
    { width: 1366, height: 768 },
    { width: 1440, height: 900 },
    { width: 1536, height: 864 },
    { width: 1600, height: 900 },
    { width: 1680, height: 1050 },
    { width: 1920, height: 1080 },
]);

const MATCH_REQUEST_THROTTLE_MS = Object.freeze({ min: 2000, max: 4000 });
const LIST_PAGE_RETRY = Object.freeze({ statusCodes: [430], maxAttempts: 5, waitMs: 30000 });
const MATCH_PAGE_RETRY = Object.freeze({ statusCodes: [430], maxAttempts: 4, waitMs: 20000 });

const pickDesktopViewport = () => {
    const index = Math.floor(Math.random() * DESKTOP_VIEWPORTS.length);
    return DESKTOP_VIEWPORTS[index];
};

/**
 * Scrapes next matches odds for the requested league.
 *
 * @param {import('playwright').Browser} browser
 * @param {string} leagueName
 * @param {string} oddsFormat
 * @param {(data: unknown, fileName: string) => Promise<void>} onResult
 * @param {number} [limit]
 */
export async function nextMatchesScraper(browser, leagueName, oddsFormat, onResult, limit) {
    const baseUrl = getUrlFrom(leagueName);

    let page;
    try {
        page = await browser.newPage();
        await page.setViewportSize(pickDesktopViewport());

        logger.info(baseUrl);

        await gotoWithRetry(page, baseUrl, {
            gotoOptions: { waitUntil: 'domcontentloaded' },
            retry: LIST_PAGE_RETRY,
        });

        for await (const { data, fileName } of collectMatchData(page, {
            leagueName,
            oddsFormat,
            limit,
            throttle: MATCH_REQUEST_THROTTLE_MS,
            matchRetry: MATCH_PAGE_RETRY,
        })) {
            await onResult(data, fileName);
        }
    } catch (error) {
        logger.error(`Error during next matches scraping: ${error}`);
        throw error;
    } finally {
        if (page && !page.isClosed()) {
            await page.close();
        }
    }
}
