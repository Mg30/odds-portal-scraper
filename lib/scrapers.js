import logger from "./logger.js";
import { getCurrentDateTimeString, getHistoricUrls, getUrlFrom, setOddsFormat } from "./utils.js";
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
 * @param {import('playwright').Page} page - The page to extract data from.
 * @param {function} callback - The callback function that handles writing data to different storage.
 */
async function extractOddsData(page, callback, leagueName) {
    logger.info("fetching links")
    await page.waitForSelector('div.group.flex > a') // Playwright uses similar waitForSelector
    const links = await page.locator('div.group.flex > a').evaluateAll(els => els.map(el => el.getAttribute("href")));
    const uniqueLinks = Array.from(new Set(links));
    for (const link of uniqueLinks) {
        try {
            await page.goto(`https://www.oddsportal.com${link}`, { waitUntil: 'domcontentloaded' }); // Added waitUntil option

            // Wait for the page to load and try multiple selectors for date/time
            let dateTimeElements = [];
            try {
                await page.waitForSelector('[data-testid="game-time-item"] p', { timeout: 5000 });
                dateTimeElements = await page.locator('[data-testid="game-time-item"] p').allTextContents();
            } catch {
                // Fallback selectors if the main one doesn't work
                try {
                    await page.waitForSelector('.text-xs.text-gray-dark', { timeout: 3000 });
                    dateTimeElements = await page.locator('.text-xs.text-gray-dark').allTextContents();
                } catch {
                    // Set default values if selectors fail
                    dateTimeElements = ['Today', new Date().toLocaleDateString(), new Date().toLocaleTimeString()];
                }
            }
            const [day, date, time] = dateTimeElements.length >= 3 ? dateTimeElements : ['Today', new Date().toLocaleDateString(), new Date().toLocaleTimeString()];

            // Wait for team elements and try multiple selectors
            let teamElements = [];
            try {
                await page.waitForSelector('[data-testid="game-participants"] p.truncate', { timeout: 5000 });
                teamElements = await page.locator('[data-testid="game-participants"] p.truncate').allTextContents();
            } catch {
                // Fallback selectors for team names
                try {
                    await page.waitForSelector('h1 span', { timeout: 3000 });
                    const fullTitle = await page.locator('h1').textContent();
                    if (fullTitle && fullTitle.includes(' - ')) {
                        teamElements = fullTitle.split(' - ').map(team => team.trim());
                    }
                } catch {
                    // Another fallback - try to extract from URL or page title
                    const url = page.url();
                    const urlParts = url.split('/');
                    const matchPart = urlParts[urlParts.length - 1];
                    if (matchPart.includes('-vs-')) {
                        teamElements = matchPart.split('-vs-').map(team => team.replace(/-/g, ' ').trim());
                    } else {
                        teamElements = ['Team 1', 'Team 2']; // Fallback values
                    }
                }
            }
            const [homeTeam, awayTeam] = teamElements.length >= 2 ? teamElements : ['Team 1', 'Team 2'];

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

    const buttons = await page.locator(buttonSelector).elementHandles();
    const [fullTime, firstHalf, secondHalf] = buttons; // Assuming order is correct

    // Use a switch statement to click the correct button based on oddTypeChoosen
    switch (oddTypeChoosen) {
        case 'fullTime':
            if (fullTime) await fullTime.click();
            break;
        case 'firstHalf':
            if (firstHalf) await firstHalf.click();
            break;
        case 'secondHalf':
            if (secondHalf) await secondHalf.click();
            break;
        default:
            throw new Error(`Unknown odd type: ${oddTypeChoosen}`);
    }

    await page.waitForSelector(rowsSelector)
    return await page.locator(rowsSelector).evaluateAll(els => els.map(el => {
        const pElements = Array.from(el.querySelectorAll('p'));
        const [bookMakerName, hw, d, aw] = pElements.map(element => element.textContent);
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
    const marketUlSelector = 'ul.visible-links.bg-black-main.odds-tabs > li'
    await page.waitForSelector(marketUlSelector)

    // Click the 'Over/Under' tab
    await page.locator(marketUlSelector).filter({ hasText: 'Over/Under' }).click();

    const specificMarketSelector = 'div.flex.w-full.items-center.justify-start.pl-3.font-bold';
    await page.waitForSelector(specificMarketSelector);

    // Click the specific Over/Under market (e.g., +2.5)
    await page.locator(specificMarketSelector).filter({ hasText: mapping[underOver] }).click();


    const rowDataSelector = 'div.border-black-borders.flex.h-9.border-b.border-l.border-r.text-xs.bg-gray-med_light.border-black-borders.border-b';
    await page.waitForSelector(rowDataSelector);

    const data = await page.locator(rowDataSelector).evaluateAll(rows => {
        return rows.map(row => {
            const bookmakerNameElement = row.querySelector('a > p');
            const bookmakerName = bookmakerNameElement ? bookmakerNameElement.textContent.trim() : 'Unknown';

            const oddsElements = row.querySelectorAll('div.flex-center.font-bold > div > p');
            const oddsOver = oddsElements.length > 0 ? oddsElements[0].textContent.trim() : 'N/A';
            const oddsUnder = oddsElements.length > 1 ? oddsElements[1].textContent.trim() : 'N/A';

            if (bookmakerName !== 'Unknown' && oddsOver !== 'N/A' && oddsUnder !== 'N/A') {
                return { bookmakerName, oddsOver, oddsUnder };
            }
            return null; // Return null for rows that don't meet criteria
        }).filter(item => item !== null); // Filter out null items
    });

    return data
};


/**
* Scrapes odds data from the current page.
*
* @param {import('playwright').Page} page - The Playwright page object.
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
 * @param {import('playwright').Page} page - The Playwright page object.
 * @param {function} callback - The callback function that handles writing data to different storage.
 */
async function scrapeOddsHistoric(page, oddsFormat, callback, leagueName) {
    await page.waitForSelector("a.pagination-link")
    let pageNumbers = await page.locator("a.pagination-link").evaluateAll(els => els.map(el => el.textContent).filter(text => text !== 'Next'));
    const currentUrl = page.url();

    for (const pag of pageNumbers) {
        let pageUrl = `${currentUrl}#/page/${pag}`; // Ensure base URL doesn't already have #
        if (currentUrl.includes('#')) { // Adjust if base URL might already contain a fragment
            pageUrl = `${currentUrl.split('#')[0]}#/page/${pag}`;
        }
        logger.info(pageUrl);
        try {
            await page.goto(pageUrl, { waitUntil: 'domcontentloaded' });
            await scrapeOdds(page, oddsFormat, callback, leagueName);
        } catch (error) {
            logger.error(error)
        }
    }
    // Closing the page is typically handled by the caller (e.g., historicScraper or nextMatchesScraper)
    // await page.close();
}


/**
 * Scrapes odds data for historic matches from each championship URL in the `championShipUrls` array.
 *
 * @param {import('playwright').Browser} browser - The Playwright browser object.
 * @param {function} callback - The callback function that handles writing data to different storage.
 * @returns {Object[]} - An array of objects containing the scraped data.
 */
async function historicScraper(browser, leagueName, startYear, endYear, oddsFormat, callback) {
    const historicUrls = getHistoricUrls(leagueName, startYear, endYear);
    let context; // Declare context here to close it in finally

    try {
        context = await browser.newContext(); // Create a single context for all pages in this scrape
        const promises = historicUrls.map(async url => {
            logger.info(`Starting scrape for: ${url}`);
            const page = await context.newPage(); // Use the shared context
            await page.setViewportSize({ width: 1800, height: 2500 });
            await page.goto(url, { waitUntil: 'domcontentloaded' });
            try {
                await scrapeOddsHistoric(page, oddsFormat, callback, leagueName);
            } finally {
                await page.close(); // Ensure individual pages are closed
            }
        });

        const results = await Promise.allSettled(promises);

        const errors = results.filter(result => result.status === 'rejected');
        if (errors.length > 0) logger.error(JSON.stringify(errors));
    } catch (error) {
        logger.error(`Error during historic scraping: ${error}`);
        throw error; // Re-throw to be caught by the command
    } finally {
        if (context) {
            await context.close(); // Close the context after all operations
        }
    }
}


/**
 * Scrapes the next matches' odds for a given league using the specified odds format.
 *
 * @param {import('playwright').Browser} browser - The browser instance used to create a new page.
 * @param {string} leagueName - The name of the league to scrape matches from.
 * @param {function} callback - The callback function that handles writing data to different storage.
 * @param {string} oddsFormat - The desired odds format (e.g., "EU", "US", etc.).
 * 
 */
async function nextMatchesScraper(browser, leagueName, oddsFormat, callback) {
    const baseUrl = getUrlFrom(leagueName);
    let page; // Declare page here to close it in finally

    try {
        page = await browser.newPage(); // Creates a page with its own context by default
        await page.setViewportSize({ width: 1800, height: 2555 });
        console.log(baseUrl)
        await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
        await scrapeOdds(page, oddsFormat, callback, leagueName);
    } catch (error) {
        logger.error(`Error during next matches scraping: ${error}`);
        throw error; // Re-throw to be caught by the command
    } finally {
        if (page && !page.isClosed()) {
            await page.close(); // Ensure page is closed
        }
    }
}


export { historicScraper, nextMatchesScraper };
