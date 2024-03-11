import puppeteerExtra from 'puppeteer-extra';
import stealthPlugin from 'puppeteer-extra-plugin-stealth';
import { anonymizeProxy } from 'proxy-chain';

puppeteerExtra.use(stealthPlugin());

const configuration = ["--unlimited-storage",
    "--full-memory-crash-report",
    "--disable-gpu",
    "--ignore-certificate-errors",
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--lang=en-US;q=0.9,en;q=0.8",
]
if (process.env.ODDS_PORTAL_PROXY_URL) {
    console.log("USING PROXY")
    const oldProxyUrl = process.env.ODDS_PORTAL_PROXY_URL
    const newProxyUrl = await anonymizeProxy(oldProxyUrl);
    configuration.push(`--proxy-server=${newProxyUrl}`)
}



export default async function launchPuppeteer() {
    const browser = await puppeteerExtra.launch({
        headless: 'new', args: [...configuration
        ]
    });
    return browser;
}