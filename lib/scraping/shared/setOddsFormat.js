import logger from "../../logger.js";
import { oddsFormatMap } from "../../constants.js";
import { dispatchClick } from "./dispatchClick.js";

/**
 * Sets the odds format on the current page to the requested option.
 *
 * @param {import('playwright').Page} page
 * @param {string} format
 */
export async function setOddsFormat(page, format) {
    await page.setViewportSize({ width: 1800, height: 2500 });

    const chosenFormat = oddsFormatMap[format];
    if (!chosenFormat) {
        throw new Error(`format '${format}' is not supported`);
    }

    logger.info(`setting odds as '${chosenFormat}'`);

    try {
        let oddsFormatButton = null;

        try {
            await page.waitForSelector('button', { timeout: 5000 });
            oddsFormatButton = await page.locator('button')
                .filter({ hasText: /Decimal|American|Fractional/ })
                .first();
            await oddsFormatButton.waitFor({ timeout: 3000 });
        } catch {
            try {
                await page.waitForSelector('div.group > button.gap-2', { timeout: 3000 });
                oddsFormatButton = await page.locator('div.group > button.gap-2').first();
            } catch {
                await page.waitForSelector('button[class*="gap"]', { timeout: 3000 });
                oddsFormatButton = await page.locator('button[class*="gap"]').first();
            }
        }

        if (!oddsFormatButton) {
            throw new Error("Could not find odds format button");
        }

        await dispatchClick(oddsFormatButton);
        await page.waitForSelector('div.group > div.dropdown-content', { timeout: 3000 });
        const dropdownOption = page.locator('div.group > div.dropdown-content > ul > li > a')
            .filter({ hasText: chosenFormat })
            .first();
        await dispatchClick(dropdownOption);

        logger.info("Odds format changed");
    } catch (error) {
        logger.warn("Odds have not been changed: May be because odds are already set in the required format");
        if (typeof logger.debug === 'function') {
            logger.debug(error);
        }
    }
}
