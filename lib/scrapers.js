import logger from "./logger.js";
import { leaguesUrlsMap, oddsFormatMap } from "./constants.js";


function getCurrentDateTimeString() {
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
async function extractOddsData(page, callback, leagueName) {
    logger.info("fetching links")
    await page.waitForSelector('div.eventRow')
    const links = await page.$$eval('div.eventRow a[title]', els => els.map(el => el.getAttribute("href")));
    const uniqueLinks = Array.from(new Set(links));

    for (const link of uniqueLinks) {
        try {
            await page.goto(`https://www.oddsportal.com${link}`);
            const [day, date, time] = await page.$$eval('div.bg-event-start-time ~ p', els => els.map(el => el.innerText));
            const [homeTeam, awayTeam] = await page.$$eval('span.truncate', els => els.map(el => el.textContent));
            const mlFirstHalf = await extractMlOdds(page, 4);
            await page.goto(`https://www.oddsportal.com${link}`);
            const mlSecondHalf = await extractMlOdds(page, 3);
            await page.goto(`https://www.oddsportal.com${link}`);
            const mlFullTime = await extractMlOdds(page, 2);
            const scrapedAt = getCurrentDateTimeString();
            const data = { scrapedAt, day, date, time, homeTeam, awayTeam, mlFirstHalf, mlSecondHalf, mlFullTime, leagueName }
            const fileName = `${date}-${homeTeam}-${awayTeam}.json`

            await callback(data, fileName);

        }
        catch (err) {
            logger.error(`extracting data: ${err}`)
        }

    }

}

async function extractMlOdds(page, id) {
    const rowsSelector = 'div.h-9.border-b.border-l.border-r'
    const butttonSelector = `div[test-dataid="${id}"]`
    await page.waitForSelector(butttonSelector)
    await page.click(butttonSelector)
    await page.waitForSelector(rowsSelector)
    return await page.$$eval(rowsSelector, els => els.map(el => {
        const [bookMakerName, hw, d, aw] = Array.from(el.querySelectorAll('p')).map(elements => elements.textContent);
        return {
            bookMakerName,
            hw,
            d,
            aw
        }

    }));
}

/**
* Scrapes odds data from the current page.
*
* @param {Page} page - The Puppeteer page object.
* @param {function} callback - The callback function that handles writing data to different storage.
* @returns {Promise<Object[]>}  - An array of objects containing the scraped data.
*/
async function scrapeOdds(page, oddsFormat, callback, leagueName) {
    await setOddsFormat(page, oddsFormat)
    try {
        await extractOddsData(page, callback, leagueName)

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
async function scrapeOddsHistoric(page, oddsFormat, callback, leagueName) {

    // Get the number of pagination pages.
    await page.waitForSelector("a.pagination-link")
    let pages = await page.$$eval("a.pagination-link", (els) => (els.map(el => el.textContent)));
    const currentUrl = await page.url();
    // Iterate over each pagination page and scrape its odds data.
    for (const pag of pages) {
        if (pag !== 'Next') {
            let pageUrl = `${currentUrl}#/page/${pag}`
            logger.info(pageUrl);
            try {
                await page.goto(pageUrl)
                // Scrape the odds data from the pagination page.
                await scrapeOdds(page, oddsFormat, callback, leagueName);

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
        if (['mls', 'brazil-serie-a'].includes(leagueName)) {
            historicUrls.push(`${baseUrl}-${year}/results/`);
            historicUrls.push(`${baseUrl}/results/`);
        } else {
            historicUrls.push(`${baseUrl}-${year}-${year + 1}/results/`);

        }

    }

    try {
        const promises = [];

        // Iterate over each championship URL and create a Promise to scrape its odds data.
        for (const url of historicUrls) {
            logger.info(`start scraping: ${url}`);
            const page = await browser.newPage()
            await page.setViewport({ width: 1800, height: 2500 });
            await page.goto(url);
            promises.push(scrapeOddsHistoric(page, oddsFormat, callback, leagueName))

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
async function nextMatchesScraper(browser, leagueName, oddsFormat, callback) {
    // Get the base URL for the given league.
    const baseUrl = getUrlFrom(leagueName);

    // Create a new page using the provided browser instance.
    const page = await browser.newPage();
    await page.setViewport({ width: 1800, height: 2500 });
    // Navigate to the base URL to load the page.
    await page.goto(baseUrl);

    // Scrape the odds data for the next matches using the specified format.
    await scrapeOdds(page, oddsFormat, callback, leagueName);
}


export { historicScraper, nextMatchesScraper };