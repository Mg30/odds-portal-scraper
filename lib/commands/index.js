import { historicScraper, nextMatchesScraper } from '../scrapers.js'
import launchPuppeteer from '../puppeteer.js';
import logger from '../logger.js';

async function historicOdds(leagueName, startYear, endYear, oddsFormat) {
    const browser = await launchPuppeteer()
    try {
        const odds = await historicScraper(browser, leagueName, startYear, endYear, oddsFormat);
        return odds

    } catch (error) {
        logger.error("failed scraping")
        logger.error(error)
    }
    finally {
        logger.info("closing browser")
        browser.close()
    }

}

async function nextMatches(leagueName, oddsFormat) {
    const browser = await launchPuppeteer()
    try {
        const odds = await nextMatchesScraper(browser, leagueName, oddsFormat);
        return odds

    } catch (error) {
        logger.error("failed scraping")
        logger.error(error)
    }
    finally {
        logger.info("closing browser")
        browser.close()
    }
}
export { historicOdds, nextMatches }