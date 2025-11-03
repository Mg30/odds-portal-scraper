import logger from "../../logger.js";

const DEFAULT_RETRY = Object.freeze({
    statusCodes: [430],
    maxAttempts: 3,
    waitMs: 10000,
});

/**
 * Navigates with retry support for specific HTTP status codes.
 *
 * @param {import('playwright').Page} page
 * @param {string} url
 * @param {{ gotoOptions?: Parameters<import('playwright').Page['goto']>[1], retry?: { statusCodes?: number[], maxAttempts?: number, waitMs?: number } }} [options]
 * @returns {Promise<import('playwright').Response | null>}
 */
export async function gotoWithRetry(page, url, options = {}) {
    const gotoOptions = options.gotoOptions ?? { waitUntil: "domcontentloaded" };
    const retry = options.retry ?? {};

    const statusCodes = retry.statusCodes ?? DEFAULT_RETRY.statusCodes;
    const maxAttempts = retry.maxAttempts ?? DEFAULT_RETRY.maxAttempts;
    const waitMs = retry.waitMs ?? DEFAULT_RETRY.waitMs;

    let attempt = 0;
    let lastError;

    while (attempt < maxAttempts) {
        attempt += 1;

        try {
            const response = await page.goto(url, gotoOptions);
            const status = response?.status();

            if (!status || !statusCodes.includes(status)) {
                return response;
            }

            lastError = new Error(`HTTP ${status}`);
            logger.warn(`Received status ${status} for ${url} (attempt ${attempt}/${maxAttempts}). Retrying after ${waitMs} ms.`);
        } catch (error) {
            lastError = error;
            logger.warn(`Navigation error for ${url} (attempt ${attempt}/${maxAttempts}): ${error}`);
        }

        if (attempt >= maxAttempts) {
            break;
        }

        await page.waitForTimeout(waitMs);
    }

    throw new Error(`Failed to load ${url} after ${maxAttempts} attempts: ${lastError?.message ?? "unknown error"}`);
}
