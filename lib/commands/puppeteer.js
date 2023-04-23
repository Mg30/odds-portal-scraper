import puppeteerExtra from 'puppeteer-extra';
import stealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteerExtra.use(stealthPlugin());

const configuration = ["--unlimited-storage",
    "--full-memory-crash-report",
    "--disable-gpu",
    "--ignore-certificate-errors",
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--lang=en-US;q=0.9,en;q=0.8",]


export default async function launchPuppeteer() {
    const browser = await puppeteerExtra.launch({
        headless: true, args: [...this.configuration
        ]
    });
    return browser;
}