const GAME_TIME_SELECTOR = '[data-testid="game-time-item"] p';
const GAME_TIME_FALLBACK_SELECTOR = '.text-xs.text-gray-dark';
const GAME_PARTICIPANTS_SELECTOR = '[data-testid="game-participants"] p.truncate';
const GAME_TITLE_SELECTOR = 'h1';
const GAME_TITLE_SEPARATOR = ' - ';
const LONG_TIMEOUT_MS = 5000;
const SHORT_TIMEOUT_MS = 3000;

/**
 * Extracts match metadata such as datetime and participants.
 *
 * @param {import('playwright').Page} page
 * @returns {Promise<{day: string, date: string, time: string, homeTeam: string, awayTeam: string}>}
 */
export async function extractMatchMetadata(page) {
    const fallbackDate = new Date();

    const dateTimeElements = await readDateTime(page, fallbackDate);
    const [day, date, time] = dateTimeElements;

    const [homeTeam, awayTeam] = await readParticipants(page);

    return {
        day,
        date,
        time,
        homeTeam,
        awayTeam,
    };
}

/**
 * Reads the date and time information from the match page, using fallbacks when required.
 *
 * @param {import('playwright').Page} page
 * @param {Date} fallbackDate
 * @returns {Promise<[string, string, string]>}
 */
async function readDateTime(page, fallbackDate) {
    const fallbackValues = [
        'Today',
        fallbackDate.toLocaleDateString(),
        fallbackDate.toLocaleTimeString(),
    ];

    try {
        await page.waitForSelector(GAME_TIME_SELECTOR, { timeout: LONG_TIMEOUT_MS });
        const contents = await page.locator(GAME_TIME_SELECTOR).allTextContents();
        return contents.length >= 3 ? contents.slice(0, 3) : fallbackValues;
    } catch {
        try {
            await page.waitForSelector(GAME_TIME_FALLBACK_SELECTOR, { timeout: SHORT_TIMEOUT_MS });
            const fallback = await page.locator(GAME_TIME_FALLBACK_SELECTOR).allTextContents();
            return fallback.length >= 3 ? fallback.slice(0, 3) : fallbackValues;
        } catch {
            return fallbackValues;
        }
    }
}

/**
 * Reads the home and away participants from the match page.
 *
 * @param {import('playwright').Page} page
 * @returns {Promise<[string, string]>}
 * @throws {Error} When participants cannot be resolved from the page content.
 */
async function readParticipants(page) {
    try {
        await page.waitForSelector(GAME_PARTICIPANTS_SELECTOR, { timeout: LONG_TIMEOUT_MS });
        const teams = await page.locator(GAME_PARTICIPANTS_SELECTOR).allTextContents();
        if (teams.length >= 2) {
            return teams.slice(0, 2);
        }
    } catch {
        // try more relaxed strategies below
    }

    try {
        await page.waitForSelector(`${GAME_TITLE_SELECTOR} span`, { timeout: SHORT_TIMEOUT_MS });
        const title = await page.locator(GAME_TITLE_SELECTOR).textContent();
        if (title && title.includes(GAME_TITLE_SEPARATOR)) {
            return title.split(GAME_TITLE_SEPARATOR).map(part => part.trim()).slice(0, 2);
        }
    } catch {
        // continue to the last fallback
    }

    const url = page.url();
    const teamsFromUrl = parseParticipantsFromUrl(url);

    if (teamsFromUrl) {
        return teamsFromUrl;
    }

    throw new Error('Unable to determine match participants from page content.');
}

/**
 * Attempts to derive home and away team names from a match URL slug.
 *
 * @param {string} url
 * @returns {[string, string] | null}
 */
function parseParticipantsFromUrl(url) {
    if (!url) {
        return null;
    }

    const [pathWithoutHash] = url.split('#');
    const [pathWithoutQuery] = pathWithoutHash.split('?');
    const segments = pathWithoutQuery.split('/').filter(Boolean);
    const slug = segments.pop();

    if (!slug) {
        return null;
    }

    const tokens = slug.split('-').filter(Boolean);
    if (tokens.length < 2) {
        return null;
    }

    const [homeSlug, awaySlug] = tokens;

    if (!homeSlug || !awaySlug) {
        return null;
    }

    return [formatTeamName(homeSlug), formatTeamName(awaySlug)];
}

/**
 * Uppercases the first character of the provided slug fragment.
 *
 * @param {string} name
 * @returns {string}
 */
function formatTeamName(name) {
    if (!name) {
        return '';
    }

    const lower = name.toLowerCase();
    return lower.charAt(0).toUpperCase() + lower.slice(1);
}
