import logger from "../../logger.js";

export const HUMANIZE_DEFAULT = Object.freeze({
    enabled: false,
    scroll: {
        probability: 0.35,
        minDistance: 150,
        maxDistance: 600,
    },
    mouseMove: {
        probability: 0.65,
        minOffset: 40,
        maxOffset: 180,
        steps: {
            min: 12,
            max: 28,
        },
    },
});

/**
 * Merge humanizer config overrides with defaults.
 *
 * @param {typeof HUMANIZE_DEFAULT} [overrides]
 */
export function mergeHumanizeConfig(overrides) {
    if (!overrides) {
        return HUMANIZE_DEFAULT;
    }

    return {
        ...HUMANIZE_DEFAULT,
        ...overrides,
        scroll: {
            ...HUMANIZE_DEFAULT.scroll,
            ...overrides.scroll,
        },
        mouseMove: {
            ...HUMANIZE_DEFAULT.mouseMove,
            ...overrides.mouseMove,
            steps: {
                ...HUMANIZE_DEFAULT.mouseMove.steps,
                ...overrides.mouseMove?.steps,
            },
        },
    };
}

/**
 * Creates a humanizer orchestrator for Playwright actions.
 *
 * @param {import('playwright').Page} page
 * @param {ReturnType<typeof mergeHumanizeConfig>} config
 */
export function createHumanizer(page, config) {
    if (!config.enabled) {
        return {
            beforeAction: async () => { },
        };
    }

    const state = {
        initialized: false,
        mousePosition: { x: 0, y: 0 },
    };

    return {
        beforeAction: async () => {
            await maybeMoveMouse(page, config.mouseMove, state);
            await maybeScroll(page, config.scroll);
        },
    };
}

async function maybeMoveMouse(page, config, state) {
    if (!config || Math.random() > config.probability) {
        return;
    }

    const viewport = page.viewportSize() ?? { width: 1280, height: 720 };

    if (!state.initialized) {
        state.initialized = true;
        state.mousePosition = {
            x: Math.round(viewport.width / 2),
            y: Math.round(viewport.height / 2),
        };
        await page.mouse.move(state.mousePosition.x, state.mousePosition.y, { steps: 5 });
    }

    const minOffset = Math.max(0, config.minOffset ?? 20);
    const maxOffset = Math.max(minOffset + 1, config.maxOffset ?? 150);
    const offsetX = randomSignedInt(minOffset, maxOffset);
    const offsetY = randomSignedInt(minOffset, maxOffset);

    const targetX = clamp(state.mousePosition.x + offsetX, 0, viewport.width - 1);
    const targetY = clamp(state.mousePosition.y + offsetY, 0, viewport.height - 1);

    const stepConfig = config.steps ?? {};
    const minSteps = Math.max(2, stepConfig.min ?? 8);
    const maxSteps = Math.max(minSteps + 1, stepConfig.max ?? 20);
    const steps = randomInt(minSteps, maxSteps);

    await page.mouse.move(targetX, targetY, { steps });

    state.mousePosition = { x: targetX, y: targetY };
}

async function maybeScroll(page, config) {
    if (!config || Math.random() > config.probability) {
        return;
    }

    const minDistance = Math.max(1, config.minDistance ?? 100);
    const maxDistance = Math.max(minDistance + 1, config.maxDistance ?? 400);
    const distance = randomSignedInt(minDistance, maxDistance);

    try {
        await page.evaluate((delta) => {
            window.scrollBy(0, delta);
        }, distance);
    } catch (error) {
        logger.debug?.(`scroll simulation skipped: ${error}`);
    }
}

function randomInt(min, max) {
    const minSafe = Math.ceil(min);
    const maxSafe = Math.floor(max);
    return Math.floor(Math.random() * (maxSafe - minSafe + 1)) + minSafe;
}

function randomSignedInt(min, max) {
    const magnitude = randomInt(min, max);
    return Math.random() > 0.5 ? magnitude : -magnitude;
}

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}
