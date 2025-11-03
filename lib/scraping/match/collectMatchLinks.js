import logger from "../../logger.js";

/**
 * Collects unique match links from the currently loaded list page.
 *
 * @param {import('playwright').Page} page
 * @param {number|undefined} limit
 * @returns {Promise<string[]>}
 */
export async function collectMatchLinks(page, limit) {
    logger.info("fetching match links");
    const matchRowSelector = 'div[data-testid="game-row"]';
    await page.waitForSelector(matchRowSelector);

    const links = await page.locator(`${matchRowSelector} a`).evaluateAll(elements =>
        elements
            .map(el => el.getAttribute("href"))
            .filter(Boolean)
    );

    const uniqueLinks = Array.from(new Set(links));
    return typeof limit === 'number'
        ? uniqueLinks.slice(0, limit)
        : uniqueLinks;
}
