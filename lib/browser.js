import { chromium } from 'playwright';
import userAgent from 'user-agents';

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
        const agent = config.userAgent || new userAgent().toString();
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
            // Create a new context for each page for better isolation if needed, or use a default context
            const context = await this.browser.newContext({
                userAgent: this.config.userAgent,
                ignoreHTTPSErrors: true,
            });
            this.contexts.add(context);

            const page = await context.newPage();

            this.pages.add(page);

            await this.pageConfiguration(page);

            return page;
        } catch (error) {
            throw new Error(`Failed to create new page: ${error.message}`);
        }
    }

    async pageConfiguration(page) {
        await page.addInitScript(() => {
            // Remove `webdriver` flag
            Object.defineProperty(navigator, 'webdriver', {
                get: () => false,
            });


            localStorage.setItem('isTeamPageModalClosed', 'true');


            // Mock plugins
            Object.defineProperty(navigator, 'plugins', {
                get: () => [1, 2, 3],
            });

            // Mock languages
            Object.defineProperty(navigator, 'languages', {
                get: () => ['en-US', 'en'],
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
                get: () => 0,
            });
            Object.defineProperty(navigator, 'vendor', {
                get: () => 'Google Inc.',
            });
            Object.defineProperty(navigator, 'appVersion', {
                get: () => '5.0 (Windows NT 10.0; Win64; x64)',
            });
            Object.defineProperty(navigator, 'hardwareConcurrency', {
                get: () => Math.floor(Math.random() * 6) + 2, // e.g., 2, 4, 8
            });
            Object.defineProperty(navigator, 'platform', {
                get: () => 'Win32', // Common platform, can be varied
            });
            Object.defineProperty(navigator, 'deviceMemory', {
                get: () => [4, 8, 16][Math.floor(Math.random() * 3)], // Common values like 4, 8, 16 GB
            });

            // Mock navigator.connection
            if (navigator.connection) {
                Object.defineProperty(navigator, 'connection', {
                    get: () => ({
                        downlink: Math.floor(Math.random() * 50) + 50, // Random downlink between 50-100 Mbps
                        effectiveType: '4g',
                        rtt: Math.floor(Math.random() * 50) + 25, // Random RTT between 25-75 ms
                        saveData: false,
                        type: 'wifi' // or 'ethernet', 'cellular'
                    }),
                });
            }


            // Mock screen resolution
            if (window.screen) {
                Object.defineProperty(window.screen, 'width', {
                    get: () => 1920 + Math.floor(Math.random() * 100),
                });
                Object.defineProperty(window.screen, 'height', {
                    get: () => 1080 + Math.floor(Math.random() * 100),
                });
            }

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

        });
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
