import logger from "../../logger.js";

/**
 * Builds the list of paginated URLs for a historic season.
 *
 * @param {import('playwright').Page} page
 * @param {string} seasonUrl
 * @returns {Promise<string[]>}
 */
export async function discoverSeasonPages(page, seasonUrl) {
    await page.goto(seasonUrl, { waitUntil: 'domcontentloaded' });

    let pageNumbers = [];
    try {
        await page.waitForSelector("a.pagination-link", { timeout: 30000 });
        pageNumbers = await page.locator("a.pagination-link").evaluateAll(elements =>
            elements
                .map(el => el.textContent)
                .map(text => text ? text.trim() : '')
                .filter(text => text && text.toLowerCase() !== 'next')
        );
    } catch {
        logger.info(`no pagination detected for ${seasonUrl}`);
    }

    const baseUrl = page.url().split('#')[0];

    if (pageNumbers.length === 0) {
        return [baseUrl];
    }

    const uniqueNumbers = Array.from(new Set(pageNumbers));

    return uniqueNumbers.map(number => `${baseUrl}#/page/${number}`);
}
