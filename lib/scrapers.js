import logger from "./logger.js";
import { getCurrentDateTimeString, setOddsFormat } from "./utils.js"; // Removed getHistoricUrls, getUrlFrom

/**
 * Extracts odds data from the page.
 *
 * @param {import('playwright').Page} page - The page to extract data from.
 * @param {string} leagueName - The name of the league.
 * @yields {Promise<Object>} An object containing the scraped data and filename.
 */
async function* extractOddsData(page, leagueName) {
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

            yield { data, fileName };

        }
        catch (err) {
            logger.error(`extracting data: ${err}`)
        }
    }
}


async function extractMlOdds(page, oddTypeChoosen) {
    logger.info("scrapping odds for three way market");
    const rowsSelector = 'div[data-testid="over-under-expanded-row"]';
    const buttonSelector = `div.flex-center.bg-gray-medium`;
    await page.waitForSelector(buttonSelector);

    const buttons = await page.locator(buttonSelector).elementHandles();
    const [fullTime, firstHalf, secondHalf] = buttons;

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
    await page.waitForSelector('div[data-testid="odd-container"] p.odds-text');

    return await page.$$eval(rowsSelector, rows =>
        rows.map(row => {
            // Bookmaker name
            const bookieNameElem = row.querySelector('p[data-testid="outrights-expanded-bookmaker-name"]');
            const bookMakerName = bookieNameElem ? bookieNameElem.textContent.trim() : null;

            // Odds containers (should be 3 per row)
            const oddsContainers = row.querySelectorAll('div[data-testid="odd-container"]');
            const odds = Array.from(oddsContainers).map(cont => {
                const link = cont.querySelector('a.odds-link');
                const p = cont.querySelector('p.odds-text');
                // Prefer link (clickable odd), else p
                return link ? link.textContent.trim() : p ? p.textContent.trim() : null;
            });

            // Defensive: ensure always 3 odds, else fill with null
            while (odds.length < 3) odds.push(null);

            return {
                bookMakerName,
                hw: odds[0],
                d: odds[1],
                aw: odds[2]
            }
        })
    );
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
* @param {string} oddsFormat - The desired odds format.
* @param {string} leagueName - The name of the league.
* @yields {Promise<Object>} An object containing the scraped data and filename.
* @returns {AsyncGenerator<Object>}
*/
async function* scrapeOdds(page, oddsFormat, leagueName) {
    await setOddsFormat(page, oddsFormat)
    try {
        // await extractOddsData(page, callback, leagueName)
        for await (const item of extractOddsData(page, leagueName)) {
            yield item;
        }

    } catch (error) {
        logger.error(error)
    }
}

/**
 * Scrapes odds data from a historic matches page and its pagination pages.
 *
 * @param {import('playwright').Page} page - The Playwright page object.
 * @param {string} oddsFormat - The desired odds format.
 * @param {string} leagueName - The name of the league.
 * @yields {Promise<Object>} An object containing the scraped data and filename.
 * @returns {AsyncGenerator<Object>}
 */
async function* scrapeOddsHistoric(page, oddsFormat, leagueName) {
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
            for await (const item of scrapeOdds(page, oddsFormat, leagueName)) {
                yield item;
            }
        } catch (error) {
            logger.error(error)
        }
    }
}



export { scrapeOdds, scrapeOddsHistoric };
