import { errors as playwrightErrors } from "playwright";
import logger from "../../logger.js";
import { activateAllBookiesFilter } from "../shared/activateAllBookiesFilter.js";
import { dispatchClick } from "../shared/dispatchClick.js";

const MARKET_TABS_SELECTOR = 'div.hide-menu li >> div:has-text("Over/Under")';
const SPECIFIC_MARKET_SELECTOR = 'div[data-testid="over-under-collapsed-option-box"]';
const ROW_SELECTOR = 'div[data-testid="over-under-expanded-row"]';
const WAIT_SELECTOR = `${ROW_SELECTOR} p.odds-text`;

const RELOAD_RETRY = Object.freeze({
    statusCodes: [430],
    maxAttempts: 3,
    waitMs: 10000,
});

const MARKET_LABELS = {
    "1.5": "Over/Under +1.5",
    "2.5": "Over/Under +2.5",
    "3.5": "Over/Under +3.5",
};

/**
 * Scrapes over/under odds for the desired total.
 *
 * @param {import('playwright').Page} page
 * @param {"1.5"|"2.5"|"3.5"} total
 */
export async function extractOverUnderOdds(page, total) {
    const wanted = MARKET_LABELS[total];
    logger.info(`scrapping odd for under/over ${total} market`);

    await prepareOverUnderMarket(page, total, wanted);
    await ensureOddsLoaded(page, total, wanted);

    return page.$$eval(ROW_SELECTOR, (rows, expected) => {
        const clean = text => (text || '').replace(/\s+/g, ' ').trim();

        return rows
            .filter(row => {
                const totalEl = row.querySelector('div[data-testid="total-container"]');
                const totalText = totalEl ? clean(totalEl.textContent) : null;
                const attribute = row.querySelector('[provider-name]')?.getAttribute('provider-name');
                return totalText === `+${expected}` || attribute === `+${expected}`;
            })
            .map(row => {
                const bookmakerName = clean(
                    row.querySelector('p[data-testid="outrights-expanded-bookmaker-name"]')?.textContent
                );

                const oddsContainers = row.querySelectorAll('div.odds-cell');

                const takeText = element => clean(
                    (element.querySelector('a.odds-link') || element.querySelector('p.odds-text'))?.textContent
                );

                const oddsOver = oddsContainers[0] ? takeText(oddsContainers[0]) : null;
                const oddsUnder = oddsContainers[1] ? takeText(oddsContainers[1]) : null;

                return bookmakerName && oddsOver && oddsUnder
                    ? { bookmakerName, oddsOver, oddsUnder }
                    : null;
            })
            .filter(Boolean);
    }, total);
}

async function prepareOverUnderMarket(page, total, wantedLabel) {
    const el = page.locator(MARKET_TABS_SELECTOR).first();
    await dispatchClick(el);

    logger.info("click successful, waiting for market options to load...");

    await activateAllBookiesFilter(page);

    await selectSpecificMarketOption(page, total, wantedLabel);

    logger.info(`click successful, waiting for ${wantedLabel} odds to load...`);
}

async function ensureOddsLoaded(page, total, wantedLabel) {
    try {
        await page.waitForSelector(WAIT_SELECTOR);
    } catch (error) {
        if (!isTimeoutError(error)) {
            throw error;
        }

        logger.warn(`timeout waiting for ${wantedLabel} odds. Reloading page and retrying once.`);

        await reloadWithStatusRetry(page);
        await prepareOverUnderMarket(page, total, wantedLabel);
        await page.waitForSelector(WAIT_SELECTOR);
    }
}

async function reloadWithStatusRetry(page) {
    const { statusCodes, maxAttempts, waitMs } = RELOAD_RETRY;
    let lastError;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
            const response = await page.reload({ waitUntil: "domcontentloaded" });
            const status = response?.status();

            if (!status || !statusCodes.includes(status)) {
                return;
            }

            lastError = new Error(`HTTP ${status}`);

            if (attempt === maxAttempts) {
                break;
            }

            logger.warn(`received status ${status} on reload (attempt ${attempt}/${maxAttempts}). Waiting ${waitMs}ms before retry.`);
        } catch (error) {
            lastError = error;

            if (attempt === maxAttempts) {
                break;
            }

            logger.warn(`error while reloading page (attempt ${attempt}/${maxAttempts}): ${error}. Waiting ${waitMs}ms before retry.`);
        }

        await page.waitForTimeout(waitMs);
    }

    throw new Error(`failed to reload page after ${maxAttempts} attempts: ${lastError?.message ?? "unknown error"}`);
}

function isTimeoutError(error) {
    if (!error) {
        return false;
    }

    if (playwrightErrors?.TimeoutError && error instanceof playwrightErrors.TimeoutError) {
        return true;
    }

    const message = typeof error.message === "string" ? error.message.toLowerCase() : "";
    return error.name === "TimeoutError" || message.includes("timeout");
}

async function selectSpecificMarketOption(page, total, wantedLabel) {
    const locator = page.locator(`${SPECIFIC_MARKET_SELECTOR}`, { hasText: `+${total}` }).first();

    try {
        await locator.waitFor({ state: "visible", timeout: 8000 });
    } catch (error) {
        if (!isTimeoutError(error)) {
            throw error;
        }

        logger.warn(`timeout waiting for ${wantedLabel} option. Scrolling and retrying.`);
        await scrollMarketOptions(page);

        await locator.waitFor({ state: "visible" });
    }

    await dispatchClick(locator);
}

async function scrollMarketOptions(page) {
    try {
        await page.evaluate(() => {
            window.scrollBy(0, window.innerHeight || 600);
        });
    } catch (error) {
        logger.debug?.(`scroll attempt failed: ${error}`);
    }

    await page.waitForTimeout(500);
}
