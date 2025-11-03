import logger from "../../logger.js";
import { dispatchClick } from "./dispatchClick.js";

/**
 * Ensures the "All" bookies filter is active before scraping odds data.
 *
 * @param {import('playwright').Page} page
 */
export async function activateAllBookiesFilter(page) {
    try {
        const selector = 'div[data-testid="bookies-filter-nav"] [data-testid="all"]';
        const button = page.locator(selector);
        await dispatchClick(button);
        logger.info("All bookies filter activated");
    } catch (error) {
        logger.warn(`unable to activate all bookies filter: ${error}`);
    }
}
