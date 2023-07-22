import logger from "./logger.js";
import { leaguesUrlsMap, oddsFormatMap } from "./constants.js";

/**
 * Sets the odds format on the page to the specified format.
 *
 * @param {Page} page - The page to interact with.
 * @param {string} format - The desired odds format (e.g., "EU", "US", etc.).
 * @throws {Error} If the specified format is not supported.
 */
async function setOddsFormat(page, format) {
    // Wait for selectors and timeout.
    await page.waitForSelector('div.group > button.gap-2');

    const chosenFormat = oddsFormatMap[format];

    if (!chosenFormat) {
        throw new Error(`format '${format}' is not supported`);
    }

    logger.info(`setting odds as '${chosenFormat}'`);

    try {
        // Click the buttons to open the odds format dropdown menu and select the chosen format.
        await page.$$eval('div.group > button.gap-2', els => els.map(el => el.click()));
        await page.waitForTimeout(2000);
        await page.$$eval('div.group > div.dropdown-content > ul.flex.flex-col.gap-3.pt-3.pb-3.pl-3 > li > a', (els, format) => {
            els.find(el => el.textContent === format).click();
        }, chosenFormat);

        logger.info("Odds format changed");
    } catch (error) {
        logger.warn("Odds have not been changed: May be because odds are already set in the required format");
    }
}

/**
 * Extracts odds data from the page.
 *
 * @param {Page} page - The page to extract data from.
 * @param {function} callback - The callback function that handles writing data to different storage.
 */
async function extractOddsData(page, callback) {
    const links = await page.$$eval('div[set] a[title]', els => els.map(el => el.getAttribute("href")));
    const uniqueLinks = Array.from(new Set(links));

    for (const link of uniqueLinks) {
        await page.goto(`https://www.oddsportal.com${link}`);
        const [day, date, time] = await page.$$eval('div.bg-event-start-time ~ p', els => els.map(el => el.innerText));
        const [homeTeam, awayTeam] = await page.$$eval('p.truncate.h-7.flex-center', els => els.map(el => el.textContent));

        const rows = await page.$$eval(':has(div[providername])', els => els.map(el => {
            const payload = {};
            const bookMakerName = el.querySelector('div[providername] > a[target] > p').textContent;
            const odds = Array.from(el.querySelectorAll('p[data-v-4905fa49]')).map(elements => elements.textContent);
            payload[bookMakerName] = odds;
            return payload;
        }));
        const data = { day, date, time, homeTeam, awayTeam, rows }
        const fileName = `${date}-${homeTeam}-${awayTeam}.json`

        await callback(data, fileName);
    }

}

/**
* Scrapes odds data from the current page.
*
* @param {Page} page - The Puppeteer page object.
* @param {function} callback - The callback function that handles writing data to different storage.
* @returns {Promise<Object[]>}  - An array of objects containing the scraped data.
*/
async function scrapeOdds(page, oddsFormat, callback) {

    await setOddsFormat(page, oddsFormat)
    try {
        await extractOddsData(page, callback)

    } catch (error) {
        logger.error(error)
    }
}


/**
 * Scrapes odds data from a historic matches page and its pagination pages.
 *
 * @param {Page} page - The Puppeteer page object.
 * @param {function} callback - The callback function that handles writing data to different storage.
 */
async function scrapeOddsHistoric(page, oddsFormat, callback) {

    // Get the number of pagination pages.
    await page.waitForSelector("a.pagination-link")
    let pages = await page.$$eval("a.pagination-link", (els) => (els.map(el => el.textContent)));
    logger.info(`pages: ${pages}`)
    const currentUrl = await page.url();
    // Iterate over each pagination page and scrape its odds data.
    for (const pag of pages) {
        if (pag !== 'Next') {
            let pageUrl = `${currentUrl}#/page/${pag}`
            logger.info(pageUrl);
            try {
                await page.goto(pageUrl)
                // Scrape the odds data from the pagination page.
                await scrapeOdds(page, oddsFormat, callback);

            } catch (error) {
                logger.error(error)

            }

        }


    }

    // Close the page.
    await page.close();

}

/**
 * Returns an array of years within the specified range.
 *
 * @param {number} startYear - The start year of the range.
 * @param {number} endYear - The end year of the range.
 * @returns {number[]} An array containing all the years within the specified range.
 */
function getYearsInRange(startYear, endYear) {
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
function getUrlFrom(leagueName) {
    const url = leaguesUrlsMap[leagueName]; // Look up the URL in the leaguesUrlsMap.

    if (!url) {
        throw new Error(`League '${leagueName}' is not referenced`);
    }

    return url; // Return the URL if found.
}


/**
 * Scrapes odds data for historic matches from each championship URL in the `championShipUrls` array.
 *
 * @param {browser} browser - The Puppeteer browser object.
 * @param {function} callback - The callback function that handles writing data to different storage.
 * @returns {Object[]} - An array of objects containing the scraped data.
 */
async function historicScraper(browser, leagueName, startYear, endYear, oddsFormat, callback) {



    const years = getYearsInRange(parseInt(startYear), parseInt(endYear))
    const baseUrl = getUrlFrom(leagueName)

    const historicUrls = []

    for (const year of years) {

        historicUrls.push(`${baseUrl}-${year}-${year + 1}/results/`);

    }

    try {
        const promises = [];

        // Iterate over each championship URL and create a Promise to scrape its odds data.
        for (const url of historicUrls) {
            logger.info(`start scraping: ${url}`);
            const page = await browser.newPage()
            await page.goto(url);
            promises.push(scrapeOddsHistoric(page, oddsFormat, callback))

        }

        // Wait for all Promises to settle and get the results of all Promises.
        const results = await Promise.allSettled(promises);

        // Filter the results to get only the resolved Promises and flatten the resulting array.
        const errors = results.filter(result => result.status === 'rejected');
        if (errors.length > 0) logger.error(JSON.stringify(errors))
    } catch (error) {
        logger.error(`error scraping historical odds: ${error}`);
        throw error;
    }

}

/**
 * Scrapes the next matches' odds for a given league using the specified odds format.
 *
 * @param {Browser} browser - The browser instance used to create a new page.
 * @param {string} leagueName - The name of the league to scrape matches from.
 * @param {function} callback - The callback function that handles writing data to different storage.
 * @param {string} oddsFormat - The desired odds format (e.g., "EU", "US", etc.).
 * 
 */
async function nextMatchesScraper(browser, leagueName, oddsFormat) {
    // Get the base URL for the given league.
    const baseUrl = getUrlFrom(leagueName);

    // Create a new page using the provided browser instance.
    const page = await browser.newPage();

    // Navigate to the base URL to load the page.
    await page.goto(baseUrl);

    // Scrape the odds data for the next matches using the specified format.
    await scrapeOdds(page, oddsFormat, callback);
}


export { historicScraper, nextMatchesScraper };