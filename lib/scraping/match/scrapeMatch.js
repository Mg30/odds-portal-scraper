import logger from "../../logger.js";
import { getCurrentDateTimeString } from "../../utils/dateTime.js";
import { extractMatchMetadata } from "./matchMetadata.js";
import { extractMoneylineOdds } from "./moneylineOdds.js";
import { extractOverUnderOdds } from "./overUnderOdds.js";
import { gotoWithRetry } from "../shared/gotoWithRetry.js";
import { createActionRunner } from "../shared/actionRunner.js";
import { createHumanizer, mergeHumanizeConfig } from "../shared/humanizer.js";

const MATCH_RETRY_DEFAULT = Object.freeze({
    statusCodes: [430],
    maxAttempts: 4,
    waitMs: 20000,
});

const ACTION_DELAY_DEFAULT_MS = 1000;

const ACTION_RETRY_DEFAULT = Object.freeze({
    maxAttempts: 5,
    delayMs: 1000,
});

/**
 * Navigates to a match page and returns the scraped data plus filename.
 *
 * @param {import('playwright').Page} page
 * @param {string} link
 * @param {string} leagueName
 * @param {{
 *   retry?: { statusCodes?: number[], maxAttempts?: number, waitMs?: number },
 *   actionDelayMs?: number,
 *   actionRetry?: { maxAttempts?: number, delayMs?: number },
 *   humanize?: {
 *     enabled?: boolean,
 *     scroll?: { probability?: number, minDistance?: number, maxDistance?: number },
 *     mouseMove?: {
 *       probability?: number,
 *       minOffset?: number,
 *       maxOffset?: number,
 *       steps?: { min?: number, max?: number }
 *     }
 *   }
 * }} [options]
 */
export async function scrapeMatch(page, link, leagueName, options = {}) {
    const url = `https://www.oddsportal.com${link}`;
    const retry = options.retry ? { ...MATCH_RETRY_DEFAULT, ...options.retry } : MATCH_RETRY_DEFAULT;
    const actionDelayMs = options.actionDelayMs ?? ACTION_DELAY_DEFAULT_MS;
    const actionRetry = options.actionRetry
        ? { ...ACTION_RETRY_DEFAULT, ...options.actionRetry }
        : ACTION_RETRY_DEFAULT;
    const humanize = mergeHumanizeConfig(options.humanize);

    const humanizer = createHumanizer(page, humanize);
    const runAction = createActionRunner(page, actionDelayMs, actionRetry, humanizer);

    try {
        await gotoWithRetry(page, url, {
            gotoOptions: { waitUntil: 'domcontentloaded' },
            retry,
        });

        const metadata = await runAction('match metadata', () => extractMatchMetadata(page));

        const mlFullTime = await runAction('moneyline odds (full time)', () => extractMoneylineOdds(page, "fullTime"));
        const mlFirstHalf = await runAction('moneyline odds (first half)', () => extractMoneylineOdds(page, "firstHalf"));
        const mlSecondHalf = await runAction('moneyline odds (second half)', () => extractMoneylineOdds(page, "secondHalf"));
        const underOver25 = await runAction('over/under odds (2.5)', () => extractOverUnderOdds(page, "2.5"));
        const underOver15 = await runAction('over/under odds (1.5)', () => extractOverUnderOdds(page, "1.5"));
        const underOver35 = await runAction('over/under odds (3.5)', () => extractOverUnderOdds(page, "3.5"));

        const scrapedAt = getCurrentDateTimeString();

        const data = {
            scrapedAt,
            leagueName,
            ...metadata,
            mlFirstHalf,
            mlSecondHalf,
            mlFullTime,
            underOver25,
            underOver15,
            underOver35,
        };

        const fileName = `${metadata.date}-${metadata.homeTeam}-${metadata.awayTeam}.json`;

        return { data, fileName };
    } catch (error) {
        logger.error(`extracting data for ${url}: ${error}`);
        throw error;
    }
}
