import logger from "./logger.js";
import { leaguesUrlsMap, oddsFormatMap } from "./constants.js";

async function setOddsFormat(page, format) {
    // Wait for selectors and timeout.
    await page.waitForSelector('li > a.text-orange-main')
    await page.waitForSelector('div.group > button.gap-2')
    await page.waitForTimeout(2000)


    const chosenFormat = oddsFormatMap[format]

    if (!chosenFormat) {
        throw new Error(`format '${format}' is not supported`);
    }

    logger.info(`setting odds as '${chosenFormat}'`);

    try {
        // Click the buttons to open the odds format dropdown menu and select EU odds.
        await page.$$eval('div.group > button.gap-2', els => els.map(el => el.click()))
        await page.waitForTimeout(2000)
        await page.$$eval('div.group > div.dropdown-content > ul.flex.flex-col.gap-3.pt-3.pb-3.pl-3 > li > a', (els, format) => {
            els.find(el => el.textContent === format).click();
        }, chosenFormat);

        logger.info("Odds format changed");
    } catch (error) {
        logger.warn("Odds has not been changed: May be because odds are already set in required format");
    }
}

async function extractOddsData(page) {
    // Extract the odds data from each element with the 'set' attribute.
    let data = await page.$$eval('div[set]', els => els.map(el => {
        const time = el.querySelector('p.whitespace-nowrap')?.textContent;
        const date = el.querySelector('div.w-full.text-xs.font-normal.leading-5.text-black-main.font-main')?.textContent;
        const teams = Array.from(el.querySelectorAll('img')).map(el => el.getAttribute("alt"));
        const odds = Array.from(el.querySelectorAll('p.height-content')).map(el => el.textContent);

        return { time: time, date: date, teams: teams, odds: odds };
    }));

    // Map the extracted data to a simpler format.
    data = data.map(el => {
        const { time, date } = el;
        const [home_team, away_team] = el.teams;
        const [hw, d, aw] = el.odds;
        return { time, date, home_team, away_team, hw, d, aw };
    });

    return data;
}

/**
* Scrapes odds data from the current page.
*
* @param {Page} page - The Puppeteer page object.
* @returns {Promise<Object[]>}  - An array of objects containing the scraped data.
*/
async function scrapeOdds(page, oddsFormat) {

    await setOddsFormat(page, oddsFormat)
    return extractOddsData(page)
}


/**
 * Scrapes odds data from a historic matches page and its pagination pages.
 *
 * @param {Page} page - The Puppeteer page object.
 * @returns {Promise<Object[]>} - An array of objects containing the scraped data.
 */
async function scrapeOddsHistoric(page, oddsFormat) {

    // Scrape the odds data from the first page.
    let data = await scrapeOdds(page, oddsFormat);

    // Get the number of pagination pages.
    let pages = await page.$$eval("#pagination > a > span", (els) => (els.map(el => el.textContent)));


    // Iterate over each pagination page and scrape its odds data.
    for (const pag of pages) {
        let intPag = parseInt(pag)

        // Wait for the selector to appear on the page.
        await page.waitForSelector(`#pagination > a[x-page="${intPag}"]`);

        // Click the pagination page.
        await page.$eval(`#pagination > a[x-page="${intPag}"]`, el => el.click());

        // Scrape the odds data from the pagination page.
        const pageData = await scrapeOdds(page, oddsFormat);

        // Merge the odds data from the pagination page into the main data array.
        data = [...data, ...pageData];
    }

    // Close the page.
    await page.close();

    return data;
}

function getYearsInRange(startYear, endYear) {
    const years = [];
    for (let year = startYear; year <= endYear; year++) {
        years.push(year);
    }
    return years;
}


function getUrlFrom(leagueName) {
    const url = leaguesUrlsMap[leagueName];

    if (!url) {
        throw new Error(`League '${leagueName}' is not referenced`);
    }

    return url;
}


/**
 * Scrapes odds data for historic matches from each championship URL in the `championShipUrls` array.
 *
 * @param {browser} browser - The Puppeteer browser object.
 * @returns {Object[]} - An array of objects containing the scraped data.
 */
async function historicScraper(browser, leagueName, startYear, endYear, oddsFormat) {



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
            promises.push(scrapeOddsHistoric(page, oddsFormat))

        }

        // Wait for all Promises to settle and get the results of all Promises.
        const results = await Promise.allSettled(promises);

        // Filter the results to get only the resolved Promises and flatten the resulting array.
        const odds = results.filter(result => result.status === 'fulfilled').map(result => result.value).flat();
        return odds;
    } catch (error) {
        logger.error(`error scraping historical odds: ${error}`);
        throw error;
    }

}

async function nextMatchesScraper(browser, leagueName, oddsFormat) {
    const baseUrl = getUrlFrom(leagueName)
    const page = await browser.newPage()
    await page.goto(baseUrl)
    return scrapeOdds(page, oddsFormat)
}


export { historicScraper, nextMatchesScraper };