import logger from "../../logger.js";
import { activateAllBookiesFilter } from "../shared/activateAllBookiesFilter.js";
import { dispatchClick } from "../shared/dispatchClick.js";

const MONEYLINE_BUTTON_SELECTOR = 'div.flex-center.bg-gray-medium';
const ROW_SELECTOR = 'div[data-testid="over-under-expanded-row"]';

/**
 * Scrapes three-way moneyline odds for the configured match period.
 *
 * @param {import('playwright').Page} page
 * @param {"fullTime"|"firstHalf"|"secondHalf"} period
 * @returns {Promise<Array<{bookMakerName: string|null, hw: string|null, d: string|null, aw: string|null}>>}
 */
export async function extractMoneylineOdds(page, period) {
    logger.info(`scrapping odds for three way market (${period})`);

    await page.waitForSelector(MONEYLINE_BUTTON_SELECTOR);

    const buttons = await page.locator(MONEYLINE_BUTTON_SELECTOR).elementHandles();
    const [fullTime, firstHalf, secondHalf] = buttons;

    switch (period) {
        case 'fullTime':
            await dispatchClick(fullTime);
            break;
        case 'firstHalf':
            await dispatchClick(firstHalf);
            break;
        case 'secondHalf':
            await dispatchClick(secondHalf);
            break;
        default:
            throw new Error(`Unknown odd type: ${period}`);
    }

    await activateAllBookiesFilter(page);
    await page.waitForSelector('div[data-testid="odd-container"] p.odds-text');

    return page.$$eval(ROW_SELECTOR, rows =>
        rows.map(row => {
            const bookieNameElem = row.querySelector('p[data-testid="outrights-expanded-bookmaker-name"]');
            const bookMakerName = bookieNameElem ? bookieNameElem.textContent.trim() : null;

            const oddsContainers = row.querySelectorAll('div[data-testid="odd-container"]');
            const odds = Array.from(oddsContainers).map(container => {
                const link = container.querySelector('a.odds-link');
                const paragraph = container.querySelector('p.odds-text');
                return link ? link.textContent.trim() : paragraph ? paragraph.textContent.trim() : null;
            });

            while (odds.length < 3) {
                odds.push(null);
            }

            return {
                bookMakerName,
                hw: odds[0],
                d: odds[1],
                aw: odds[2],
            };
        })
    );
}
