import { leaguesUrlsMap, oddsFormatMap } from "./constants.js";
import logger from "odds-portal-scraper/lib/logger.js";

export function getHistoricUrls(leagueName, startYear, endYear) {
    const leagueInfo = leaguesUrlsMap[leagueName];
    if (!leagueInfo) {
        throw new Error(`League '${leagueName}' is not referenced`);
    }

    const { url, fixedStructure } = leagueInfo;
    const years = Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i);

    return years.map(year => fixedStructure ? `${url}/results/` : `${url}-${year}-${year + 1}/results/`);
}

export function getCurrentDateTimeString() {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    const dateTimeString = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    return dateTimeString;
}

/**
* Sets the odds format on the page to the specified format.
*
* @param {Page} page - The page to interact with.
* @param {string} format - The desired odds format (e.g., "EU", "US", etc.).
* @throws {Error} If the specified format is not supported.
*/
export async function setOddsFormat(page, format) {
    // Wait for selectors and timeout.
    await page.setViewport({ width: 1800, height: 2500 });


    const chosenFormat = oddsFormatMap[format];

    if (!chosenFormat) {
        throw new Error(`format '${format}' is not supported`);
    }

    logger.info(`setting odds as '${chosenFormat}'`);

    try {
        await page.waitForSelector('div.group > button.gap-2');
        // Click the buttons to open the odds format dropdown menu and select the chosen format.
        await page.$$eval('div.group > button.gap-2', els => els.map(el => el.click()));
        await page.waitForSelector('div.group > div.dropdown-content');
        await page.$$eval('div.group > div.dropdown-content > ul.flex.flex-col.gap-3.pt-3.pb-3.pl-3 > li > a', (els, format) => {
            els.find(el => el.textContent === format).click();
        }, chosenFormat);

        logger.info("Odds format changed");
    } catch (error) {
        logger.warn("Odds have not been changed: May be because odds are already set in the required format");
    }
}

/**
 * Returns an array of years within the specified range.
 *
 * @param {number} startYear - The start year of the range.
 * @param {number} endYear - The end year of the range.
 * @returns {number[]} An array containing all the years within the specified range.
 */
export function getYearsInRange(startYear, endYear) {
    const years = [];
    for (let year = startYear; year <= endYear; year++) {
        years.push(year); // Add the current year to the array.
    }
    return years;
}

/**
 * Retrieves the URL associated with the provided league name.
 *
 * @param {string} leagueName - The name of the league for which the URL is requested.
 * @returns {string} The URL of the specified league.
 * @throws {Error} If the leagueName does not exist in the leaguesUrlsMap.
 */
export function getUrlFrom(leagueName) {
    const { url } = leaguesUrlsMap[leagueName]; // Look up the URL in the leaguesUrlsMap.

    if (!url) {
        throw new Error(`League '${leagueName}' is not referenced`);
    }

    return url; // Return the URL if found.
}