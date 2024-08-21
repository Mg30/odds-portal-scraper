import { historicScraper, nextMatchesScraper } from '../scrapers.js'
import launchPuppeteer from '../puppeteer.js';
import logger from '../logger.js';

async function historicOdds(leagueName, startYear, endYear, oddsFormat, callback) {
    const browser = await launchPuppeteer()
    try {
        const odds = await historicScraper(browser, leagueName, startYear, endYear, oddsFormat, callback);
        return odds

    } catch (error) {
        logger.error("failed scraping")
        logger.error(error)
    }
    finally {
        try {
            logger.info("closing browser")
            await browser.close()
        } catch (error) {
            logger.error("error closing browser")
        }
    }

}

async function nextMatches(leagueName, oddsFormat, callback) {
    const browser = await launchPuppeteer()
    try {
        const odds = await nextMatchesScraper(browser, leagueName, oddsFormat, callback);
        return odds

    } catch (error) {
        logger.error("failed scraping")
        logger.error(error)
    }
    finally {
        logger.info("closing browser")
        try {
            await browser.close()

        } catch (error) {
            logger.error("error closing browser")
        }
    }
}
export { historicOdds, nextMatches }