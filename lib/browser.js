import { chromium } from 'playwright';
import userAgent from 'user-agents';

const DESKTOP_VIEWPORTS = Object.freeze([
    { width: 1280, height: 720 },
    { width: 1366, height: 768 },
    { width: 1440, height: 900 },
    { width: 1536, height: 864 },
    { width: 1600, height: 900 },
    { width: 1680, height: 1050 },
    { width: 1920, height: 1080 },
]);

const TIMEZONE_IDS = Object.freeze([
    'America/New_York',
    'America/Chicago',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Madrid',
    'Europe/Paris',
    'Europe/Berlin',
    'Europe/Rome',
    'Europe/Amsterdam',
    'Europe/Prague',
    'Europe/Warsaw',
    'Europe/Athens',
    'Europe/Dublin',
    'America/Bogota',
    'America/Mexico_City',
]);

const LOCALE_OPTIONS = Object.freeze([
    'en-US',
    'en-GB',
    'en-CA',
    'en-AU',
    'fr-FR',
    'es-ES',
    'es-AR',
    'pt-PT',
    'pt-BR',
    'de-DE',
    'it-IT',
    'nl-NL',
]);

const COLOR_SCHEMES = Object.freeze(['light', 'dark']);
const DEVICE_SCALE_FACTORS = Object.freeze([1, 1.25, 1.5, 2]);
const HARDWARE_CONCURRENCY_VALUES = Object.freeze([4, 6, 8, 12]);
const DEVICE_MEMORY_VALUES = Object.freeze([4, 8, 16]);
const CONNECTION_DOWNLINK_VALUES = Object.freeze([25, 35, 45, 55, 65, 75, 95]);
const CONNECTION_RTT_VALUES = Object.freeze([20, 30, 40, 50, 60]);

const pickRandom = (values) => values[Math.floor(Math.random() * values.length)];

const buildLanguageList = (locale) => {
    if (!locale) {
        return ['en-US', 'en'];
    }

    const [language, region] = locale.split('-');
    const normalized = region ? `${language}-${region.toUpperCase()}` : language;

    return Array.from(new Set([normalized, language]));
};

const buildAcceptLanguage = (locale) => {
    if (!locale) {
        return 'en-US,en;q=0.9';
    }

    const languages = buildLanguageList(locale);
    const [primary, secondary] = languages;
    return secondary ? `${primary},${secondary};q=0.9` : primary;
};

const deriveNavigatorMetadata = (uaString) => {
    if (!uaString || typeof uaString !== 'string') {
        return {
            platform: 'Win32',
            vendor: 'Google Inc.',
            appVersion: '5.0 (Windows NT 10.0; Win64; x64)',
        };
    }

    if (uaString.includes('Mac OS') || uaString.includes('Macintosh')) {
        return {
            platform: 'MacIntel',
            vendor: 'Apple Computer, Inc.',
            appVersion: '5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        };
    }

    if (uaString.includes('Linux') && !uaString.includes('Android')) {
        return {
            platform: 'Linux x86_64',
            vendor: 'Google Inc.',
            appVersion: '5.0 (X11; Linux x86_64)',
        };
    }

    return {
        platform: 'Win32',
        vendor: 'Google Inc.',
        appVersion: '5.0 (Windows NT 10.0; Win64; x64)',
    };
};

const buildFingerprint = ({ userAgent: ua, locale, viewport, colorScheme }) => {
    const languages = buildLanguageList(locale);
    const metadata = deriveNavigatorMetadata(ua);

    return {
        languages,
        acceptLanguage: buildAcceptLanguage(locale),
        hardwareConcurrency: pickRandom(HARDWARE_CONCURRENCY_VALUES),
        deviceMemory: pickRandom(DEVICE_MEMORY_VALUES),
        maxTouchPoints: 0,
        colorScheme,
        viewport,
        screen: {
            width: viewport.width,
            height: viewport.height,
            availWidth: viewport.width,
            availHeight: viewport.height,
            colorDepth: 24,
            pixelDepth: 24,
        },
        navigator: metadata,
        connection: {
            downlink: pickRandom(CONNECTION_DOWNLINK_VALUES),
            effectiveType: '4g',
            rtt: pickRandom(CONNECTION_RTT_VALUES),
            saveData: false,
            type: 'wifi',
        },
        pluginsLength: pickRandom([3, 4, 5]),
    };
};

const parseProxyConfig = (proxyString) => {
    if (!proxyString) {
        return null;
    }

    if (typeof proxyString === 'object') {
        return proxyString;
    }

    if (typeof proxyString !== 'string') {
        return null;
    }

    try {
        const proxyUrl = new URL(proxyString);
        if (!proxyUrl.hostname) {
            throw new Error('missing hostname');
        }

        const server = `${proxyUrl.protocol}//${proxyUrl.hostname}${proxyUrl.port ? `:${proxyUrl.port}` : ''}`;
        const proxy = { server };

        if (proxyUrl.username) {
            proxy.username = decodeURIComponent(proxyUrl.username);
        }
        if (proxyUrl.password) {
            proxy.password = decodeURIComponent(proxyUrl.password);
        }

        return proxy;
    } catch (error) {
        console.warn(`Invalid proxy URL provided. Skipping proxy configuration. Reason: ${error.message}`);
        return null;
    }
};

// Default configuration
const DEFAULT_CONFIG = {
    headless: true, // Playwright uses true/false for headless
    args: [
        "--unlimited-storage",
        "--full-memory-crash-report",
        "--disable-gpu",
        "--ignore-certificate-errors",
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--lang=en-US;q=0.9,en;q=0.8"
    ],
    proxy: parseProxyConfig(process.env.ODDS_PORTAL_PROXY_URL || null),
};

class PlaywrightBrowser {
    constructor(config = {}) {
        // Always generate a new user agent unless provided
        const agent = config.userAgent || new userAgent({ deviceCategory: 'desktop' }).toString();
        const mergedConfig = { ...DEFAULT_CONFIG, ...config };
        const proxy = parseProxyConfig(mergedConfig.proxy);

        this.config = { ...mergedConfig, proxy, userAgent: agent };
        this.browser = null;
        this.contexts = new Set(); // Manage browser contexts
        this.pages = new Set();
    }

    async init() {
        try {
            const launchOptions = {
                headless: this.config.headless,
                args: this.config.args,
                ignoreHTTPSErrors: true,
            };

            if (this.config.proxy) {
                console.log("USING PROXY");
                launchOptions.proxy = this.config.proxy;
            }

            this.browser = await chromium.launch(launchOptions);

            if (!this.browser || !this.browser.isConnected()) {
                throw new Error('Browser failed to initialize');
            }

            return this.browser;
        } catch (error) {
            await this.cleanup();
            throw new Error(`Browser initialization failed: ${error.message}`);
        }
    }

    async newPage() {
        if (!this.browser || !this.browser.isConnected()) {
            throw new Error('Browser not initialized or not connected');
        }

        try {
            const viewport = this.config.viewport || pickRandom(DESKTOP_VIEWPORTS);
            const deviceScaleFactor = this.config.deviceScaleFactor || pickRandom(DEVICE_SCALE_FACTORS);
            const timezoneId = this.config.timezoneId || pickRandom(TIMEZONE_IDS);
            const locale = this.config.locale || pickRandom(LOCALE_OPTIONS);
            const colorScheme = this.config.colorScheme || pickRandom(COLOR_SCHEMES);
            const fingerprint = buildFingerprint({
                userAgent: this.config.userAgent,
                locale,
                viewport,
                colorScheme,
            });

            const context = await this.browser.newContext({
                userAgent: this.config.userAgent,
                ignoreHTTPSErrors: true,
                viewport,
                screen: { width: viewport.width, height: viewport.height },
                locale,
                timezoneId,
                colorScheme,
                deviceScaleFactor,
                isMobile: false,
                hasTouch: fingerprint.maxTouchPoints > 0,
            });
            this.contexts.add(context);

            await context.setExtraHTTPHeaders({
                'Accept-Language': fingerprint.acceptLanguage,
            });

            const page = await context.newPage();

            this.pages.add(page);

            await page.emulateMedia({ colorScheme });
            await this.pageConfiguration(page, {
                ...fingerprint,
                devicePixelRatio: deviceScaleFactor,
                outerWidth: viewport.width + 16,
                outerHeight: viewport.height + 88,
            });

            await page.setViewportSize(viewport);

            return page;
        } catch (error) {
            throw new Error(`Failed to create new page: ${error.message}`);
        }
    }

    async pageConfiguration(page, fingerprint) {
        await page.addInitScript((overrides) => {
            // Remove `webdriver` flag
            Object.defineProperty(navigator, 'webdriver', {
                get: () => false,
            });

            localStorage.setItem('isTeamPageModalClosed', 'true');

            const definedPlugins = Array.from({ length: overrides.pluginsLength }, (_, index) => index + 1);
            Object.defineProperty(navigator, 'plugins', {
                get: () => definedPlugins,
            });

            Object.defineProperty(navigator, 'languages', {
                get: () => overrides.languages,
            });

            Object.defineProperty(navigator, 'language', {
                get: () => overrides.languages[0],
            });

            // Mock getUserMedia to prevent WebRTC leaks
            if (navigator.mediaDevices) {
                const originalGetUserMedia = navigator.mediaDevices.getUserMedia;
                navigator.mediaDevices.getUserMedia = function (constraints) {
                    if (constraints && constraints.video) {
                        return Promise.resolve({
                            getTracks: () => [],
                            getVideoTracks: () => [],
                            getAudioTracks: () => [],
                            getTrackById: () => null,
                            addTrack: () => { },
                            removeTrack: () => { },
                            stop: () => { },
                        });
                    }
                    return originalGetUserMedia ? originalGetUserMedia.call(navigator.mediaDevices, constraints) : Promise.reject(new Error("getUserMedia is not implemented"));
                };
            }


            // Mock permissions
            if (window.navigator && window.navigator.permissions) {
                const originalQuery = window.navigator.permissions.query;
                window.navigator.permissions.query = (parameters) =>
                    parameters.name === 'notifications'
                        ? Promise.resolve({ state: Notification.permission })
                        : originalQuery(parameters);
            }


            // Mock other navigator properties
            Object.defineProperty(navigator, 'maxTouchPoints', {
                get: () => overrides.maxTouchPoints,
            });
            Object.defineProperty(navigator, 'vendor', {
                get: () => overrides.navigator.vendor,
            });
            Object.defineProperty(navigator, 'appVersion', {
                get: () => overrides.navigator.appVersion,
            });
            Object.defineProperty(navigator, 'hardwareConcurrency', {
                get: () => overrides.hardwareConcurrency,
            });
            Object.defineProperty(navigator, 'platform', {
                get: () => overrides.navigator.platform,
            });
            Object.defineProperty(navigator, 'deviceMemory', {
                get: () => overrides.deviceMemory,
            });

            Object.defineProperty(window, 'devicePixelRatio', {
                get: () => overrides.devicePixelRatio,
            });

            // Mock navigator.connection
            Object.defineProperty(navigator, 'connection', {
                configurable: true,
                get: () => overrides.connection,
            });


            // Mock screen resolution
            if (window.screen) {
                Object.defineProperty(window.screen, 'width', {
                    get: () => overrides.screen.width,
                });
                Object.defineProperty(window.screen, 'height', {
                    get: () => overrides.screen.height,
                });
                Object.defineProperty(window.screen, 'availWidth', {
                    get: () => overrides.screen.availWidth,
                });
                Object.defineProperty(window.screen, 'availHeight', {
                    get: () => overrides.screen.availHeight,
                });
                Object.defineProperty(window.screen, 'colorDepth', {
                    get: () => overrides.screen.colorDepth,
                });
                Object.defineProperty(window.screen, 'pixelDepth', {
                    get: () => overrides.screen.pixelDepth,
                });
            }

            Object.defineProperty(window, 'outerWidth', {
                get: () => overrides.outerWidth,
            });

            Object.defineProperty(window, 'outerHeight', {
                get: () => overrides.outerHeight,
            });

            // Mock WebGL
            try {
                const getParameter = WebGLRenderingContext.prototype.getParameter;
                WebGLRenderingContext.prototype.getParameter = function (parameter) {
                    // Override specific parameters used for fingerprinting
                    if (parameter === 37445) { // VENDOR
                        return 'Google Inc. (Intel)';
                    }
                    if (parameter === 37446) { // RENDERER
                        return 'ANGLE (Intel, Intel(R) UHD Graphics 630 (0x00003E9B) Direct3D11 vs_5_0 ps_5_0, D3D11)';
                    }
                    return getParameter.call(this, parameter);
                };
            } catch (e) { /* WebGL not available or an error occurred */ }

            // Mock window.chrome
            if (typeof window.chrome !== 'undefined') {
                window.chrome = {
                    ...window.chrome,
                    runtime: {},
                };
            }

        }, fingerprint);
    }

    async close() {
        try {
            for (const page of this.pages) {
                if (!page.isClosed()) {
                    await page.close();
                }
            }
            this.pages.clear();

            for (const context of this.contexts) {
                await context.close();
            }
            this.contexts.clear();

            if (this.browser && this.browser.isConnected()) {
                await this.browser.close();
            }
        } catch (error) {
            console.error('Error during cleanup:', error);
        } finally {
            this.browser = null;
        }
    }

    async cleanup() {
        await this.close();
    }
}

export default async function launchBrowser(config = {}) {
    const browserInstance = new PlaywrightBrowser(config);
    await browserInstance.init();
    return browserInstance;
}
