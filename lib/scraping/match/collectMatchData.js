import logger from "../../logger.js";
import { setOddsFormat } from "../shared/setOddsFormat.js";
import { collectMatchLinks } from "./collectMatchLinks.js";
import { scrapeMatch } from "./scrapeMatch.js";

const resolveThrottleDelay = throttle => {
    if (!throttle) {
        return 0;
    }

    if (typeof throttle === "number") {
        return Math.max(0, throttle);
    }

    const min = Math.max(0, throttle.min ?? 0);
    const max = Math.max(min, throttle.max ?? min);

    if (max === 0) {
        return 0;
    }

    if (min === max) {
        return min;
    }

    return Math.floor(Math.random() * (max - min + 1)) + min;
};

const waitForThrottleGap = async (page, throttle) => {
    const delay = resolveThrottleDelay(throttle);

    if (delay > 0) {
        await page.waitForTimeout(delay);
    }
};

/**
 * Async generator yielding match data from the current list page.
 *
 * @param {import('playwright').Page} page
 * @param {{ leagueName: string, oddsFormat: string, limit?: number, throttle?: number | { min: number, max: number }, matchRetry?: { statusCodes?: number[], maxAttempts?: number, waitMs?: number } }} options
 */
export async function* collectMatchData(page, options) {
    const { leagueName, oddsFormat, limit, throttle, matchRetry } = options;

    await setOddsFormat(page, oddsFormat);

    const links = await collectMatchLinks(page, limit);

    let shouldThrottle = false;

    for (const link of links) {
        if (shouldThrottle) {
            await waitForThrottleGap(page, throttle);
        }

        shouldThrottle = true;

        try {
            const result = await scrapeMatch(page, link, leagueName, { retry: matchRetry });
            yield result;
        } catch (error) {
            logger.error(error);
        }
    }
}
