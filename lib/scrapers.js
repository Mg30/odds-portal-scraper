import logger from "./logger.js";
import { getCurrentDateTimeString, getHistoricUrls, getUrlFrom, getYearsInRange, setOddsFormat } from "./utils.js";
import * as fs from 'fs/promises'


async function writeFileAsync(filePath, content) {


    try {
        await fs.writeFile(filePath, content, 'utf8');
        console.log('File written successfully');
    } catch (error) {
        console.error('Error writing file:', error);
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
    await page.waitForSelector('div.group.flex')
    const links = await page.$$eval('div.group.flex > a', els => els.map(el => el.getAttribute("href")));
    const uniqueLinks = Array.from(new Set(links));
    for (const link of uniqueLinks) {
        try {

            await page.goto(`https://www.oddsportal.com${link}`);
            const [day, date, time] = await page.$$eval('div.bg-event-start-time ~ p', els => els.map(el => el.innerText));
            const [homeTeam, awayTeam] = await page.$$eval('span.truncate', els => els.map(el => el.textContent));
            const mlFullTime = await extractMlOdds(page, "fullTime");
            const mlFirstHalf = await extractMlOdds(page, "firstHalf");
            const mlSecondHalf = await extractMlOdds(page, "secondHalf");
            const underOver25 = await extractOverUnderOdds(page, "2.5")
            const underOver15 = await extractOverUnderOdds(page, '1.5')
            const underOver35 = await extractOverUnderOdds(page, '3.5')
            const scrapedAt = getCurrentDateTimeString();
            const data = {
                scrapedAt,
                day,
                date,
                time,
                homeTeam,
                awayTeam,
                mlFirstHalf,
                mlSecondHalf,
                mlFullTime,
                leagueName,
                underOver25,
                underOver15,
                underOver35
            }
            const fileName = `${date}-${homeTeam}-${awayTeam}.json`

            await callback(data, fileName);

        }
        catch (err) {
            logger.error(`extracting data: ${err}`)
        }

    }

}

async function extractMlOdds(page, oddTypeChoosen) {
    logger.info("scrapping odds for three way market")
    const rowsSelector = 'div.border-black-borders.flex.h-9.border-b.border-l.border-r.text-xs'
    const buttonSelector = `div.flex-center.bg-gray-medium`
    await page.waitForSelector(buttonSelector)

    const [fullTime, firstHalf, secondHalf] = await page.$$(buttonSelector);

    // Use a switch statement to click the correct button based on oddTypeChoosen
    switch (oddTypeChoosen) {
        case 'fullTime':
            await fullTime.click();
            break;
        case 'firstHalf':
            await firstHalf.click();
            break;
        case 'secondHalf':
            await secondHalf.click();
            break;
        default:
            throw new Error(`Unknown odd type: ${oddTypeChoosen}`);
    }



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


async function extractOverUnderOdds(page, underOver) {
    const mapping = {
        "2.5": "Over/Under +2.5",
        "1.5": "Over/Under +1.5",
        "3.5": "Over/Under +3.5"
    }
    logger.info(`scrapping odd for under/over ${underOver} market`)
    const marketUlselector = 'ul.visible-links.bg-black-main.odds-tabs > li'
    await page.waitForSelector(marketUlselector)
    await page.$$eval(marketUlselector, (els) => {
        el = els.find(el => el.innerText === 'Over/Under')
        el.click()
    })


    await page.waitForSelector('div.flex.w-full.items-center.justify-start.pl-3.font-bold')

    await page.$$eval('div.flex.w-full.items-center.justify-start.pl-3.font-bold', (els, underOver) => {
        const regex = /(Over\/Under \+\d\.\d)/;
        els.find(el => {
            const match = el.innerText.match(regex);
            if (match) {
                return match[1] === underOver
            }
            return false
        }).click()

    }, mapping[underOver])

    await page.waitForSelector('div.border-black-borders.flex.h-9.border-b.border-l.border-r.text-xs.bg-gray-med_light.border-black-borders.border-b');


    const data = await page.evaluate(() => {
        const data = [];
        const rows = document.querySelectorAll('div.border-black-borders.flex.h-9.border-b.border-l.border-r.text-xs.bg-gray-med_light.border-black-borders.border-b');
        rows.forEach(row => {
            // Extract bookmaker name
            const bookmakerNameElement = row.querySelector('a > p');
            const bookmakerName = bookmakerNameElement ? bookmakerNameElement.textContent.trim() : 'Unknown';

            // Extracting odds, assuming the structure is consistent with the example provided
            // The "over 2.5" odds are assumed to be the first number following "+2.5"
            // The "under 2.5" odds are assumed to be the second number following "+2.5"
            const oddsElements = row.querySelectorAll('div.flex-center.font-bold > div > p');
            const oddsOver = oddsElements.length > 0 ? oddsElements[0].textContent.trim() : 'N/A';
            const oddsUnder = oddsElements.length > 1 ? oddsElements[1].textContent.trim() : 'N/A';
            // Filter condition: bookmaker name must not be 'Unknown' and both odds must not be 'N/A'
            if (bookmakerName !== 'Unknown' && oddsOver !== 'N/A' && oddsUnder !== 'N/A') {
                data.push({ bookmakerName, oddsOver, oddsUnder });
            }
        });

        return data;
    });

    return data
};


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
 * Scrapes odds data for historic matches from each championship URL in the `championShipUrls` array.
 *
 * @param {browser} browser - The Puppeteer browser object.
 * @param {function} callback - The callback function that handles writing data to different storage.
 * @returns {Object[]} - An array of objects containing the scraped data.
 */
async function historicScraper(browser, leagueName, startYear, endYear, oddsFormat, callback) {
    const historicUrls = getHistoricUrls(leagueName, startYear, endYear);

    try {
        const promises = historicUrls.map(async url => {
            logger.info(`Starting scrape for: ${url}`);
            const page = await browser.newPage();
            await page.setViewport({ width: 1800, height: 2500 });
            await page.goto(url);
            return scrapeOddsHistoric(page, oddsFormat, callback, leagueName);
        });

        const results = await Promise.allSettled(promises);

        const errors = results.filter(result => result.status === 'rejected');
        if (errors.length > 0) logger.error(JSON.stringify(errors));
    } catch (error) {
        logger.error(`Error during historic scraping: ${error}`);
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
    await page.setViewport({ width: 1800, height: 2555 });
    // Navigate to the base URL to load the page.
    console.log(baseUrl)
    await page.goto(baseUrl);

    // Scrape the odds data for the next matches using the specified format.
    await scrapeOdds(page, oddsFormat, callback, leagueName);
}


export { historicScraper, nextMatchesScraper };