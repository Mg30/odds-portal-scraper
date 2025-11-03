import { errors as playwrightErrors } from "playwright";
import logger from "../../logger.js";

const DEFAULT_HUMANIZER = Object.freeze({
    beforeAction: async () => { },
});

/**
 * Creates an action runner that adds delays, retries, and optional humanization.
 *
 * @param {import('playwright').Page} page
 * @param {number} actionDelayMs
 * @param {{ maxAttempts: number, delayMs: number }} retryConfig
 * @param {{ beforeAction?: (description: string) => Promise<void> }} [humanizer]
 */
export function createActionRunner(page, actionDelayMs, retryConfig, humanizer) {
    let isFirstAction = true;
    const appliedHumanizer = humanizer ?? DEFAULT_HUMANIZER;

    return async (description, action) => {
        if (!isFirstAction) {
            await waitForDelay(page, actionDelayMs);
        }

        isFirstAction = false;

        return performWithLocatorRetry({
            action,
            description,
            page,
            retryConfig,
            humanizer: appliedHumanizer,
        });
    };
}

async function performWithLocatorRetry({ action, description, page, retryConfig, humanizer }) {
    const { maxAttempts, delayMs } = retryConfig;
    let lastError;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
            await humanizer.beforeAction(description);
            return await action();
        } catch (error) {
            if (!isLocatorTimeoutError(error)) {
                throw error;
            }

            lastError = error;

            if (attempt === maxAttempts) {
                break;
            }

            logger.warn(`[${description}] locator timed out (attempt ${attempt}/${maxAttempts}). Retrying in ${delayMs}ms.`);
            await waitForDelay(page, delayMs);
        }
    }

    throw lastError;
}

async function waitForDelay(page, delayMs) {
    if (!delayMs || delayMs <= 0) {
        return;
    }

    await page.waitForTimeout(delayMs);
}

function isLocatorTimeoutError(error) {
    if (!error) {
        return false;
    }

    if (playwrightErrors?.TimeoutError && error instanceof playwrightErrors.TimeoutError) {
        return true;
    }

    if (typeof error.message === "string" && error.message.toLowerCase().includes("timeout")) {
        return true;
    }

    return error.name === "TimeoutError";
}
