import { chromium } from 'playwright';
import userAgent from 'user-agents';

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
    proxy: process.env.ODDS_PORTAL_PROXY_URL || null,
};

class PlaywrightBrowser {
    constructor(config = {}) {
        // Always generate a new user agent unless provided
        const agent = config.userAgent || new userAgent().toString();
        this.config = { ...DEFAULT_CONFIG, ...config, userAgent: agent };
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
                launchOptions.proxy = {
                    server: this.config.proxy
                };
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
                get: () => Math.floor(Math.random() * 6) + 2,
            });

            // Mock screen resolution
            if (window.screen) {
                Object.defineProperty(window.screen, 'width', {
                    get: () => 1920 + Math.floor(Math.random() * 100),
                });
                Object.defineProperty(window.screen, 'height', {
                    get: () => 1080 + Math.floor(Math.random() * 100),
                });
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
