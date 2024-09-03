import puppeteerExtra from 'puppeteer-extra';
import stealthPlugin from 'puppeteer-extra-plugin-stealth';
import userAgent from 'user-agents';
import { anonymizeProxy } from 'proxy-chain';

// Original launchPuppeteer function
puppeteerExtra.use(stealthPlugin());

const configuration = [
    "--unlimited-storage",
    "--full-memory-crash-report",
    "--disable-gpu",
    "--ignore-certificate-errors",
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--lang=en-US;q=0.9,en;q=0.8",
];

if (process.env.ODDS_PORTAL_PROXY_URL) {
    console.log("USING PROXY");
    const oldProxyUrl = process.env.ODDS_PORTAL_PROXY_URL;
    const newProxyUrl = await anonymizeProxy(oldProxyUrl);
    configuration.push(`--proxy-server=${newProxyUrl}`);
}


class StealthBrowser {
    constructor() {
        this.configuration = [...configuration];
        this.browser = null;

    }

    async init() {
        this.browser = await puppeteerExtra.launch({
            headless: 'new',
            args: [...configuration],
        });
    }

    async newPage() {
        const page = await this.browser.newPage();
        await page.setUserAgent(userAgent.toString());
        await this.pageConfiguration(page);
        return page;
    }

    async pageConfiguration(page) {
        await page.evaluateOnNewDocument(() => {
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
            const getUserMedia = navigator.mediaDevices.getUserMedia;
            navigator.mediaDevices.getUserMedia = function (constraints) {
                if (constraints.video) {
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
                return getUserMedia(constraints);
            };

            // Mock permissions
            const originalQuery = window.navigator.permissions.query;
            window.navigator.permissions.query = (parameters) =>
                parameters.name === 'notifications'
                    ? Promise.resolve({ state: Notification.permission })
                    : originalQuery(parameters);

            // Mock other navigator properties
            Object.defineProperty(navigator, 'maxTouchPoints', {
                get: () => 0, // Typically 0 for desktop and >1 for mobile devices
            });
            Object.defineProperty(navigator, 'vendor', {
                get: () => 'Google Inc.', // Common for Chrome
            });
            Object.defineProperty(navigator, 'appVersion', {
                get: () => '5.0 (Windows NT 10.0; Win64; x64)', // Adjust based on the platform
            });

            // Mock hardwareConcurrency (randomized)
            Object.defineProperty(navigator, 'hardwareConcurrency', {
                get: () => Math.floor(Math.random() * 6) + 2, // Random number between 2 and 8
            });

            // Mock screen resolution (slightly randomized)
            Object.defineProperty(window.screen, 'width', {
                get: () => 1920 + Math.floor(Math.random() * 100), // Random between 1920 and 2020
            });
            Object.defineProperty(window.screen, 'height', {
                get: () => 1080 + Math.floor(Math.random() * 100), // Random between 1080 and 1180
            });

            // Randomize time taken to load scripts
            const originalAppendChild = Element.prototype.appendChild;
            Element.prototype.appendChild = function () {
                const result = originalAppendChild.apply(this, arguments);
                if (arguments[0].tagName === 'SCRIPT') {
                    return new Promise((resolve) => setTimeout(resolve, Math.floor(Math.random() * 300))).then(() => result);
                }
                return result;
            };
        });
    }

    async close() {
        await this.browser.close();
    }
}


export default async function launchPuppeteer() {
    const browser = new StealthBrowser()
    await browser.init();
    return browser
}