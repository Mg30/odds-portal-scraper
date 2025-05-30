import { historicScraper, nextMatchesScraper } from '../scraperOrchestrators.js'
import launchBrowser from '../browser.js';
import logger from '../logger.js';

async function historicOdds(leagueName, startYear, endYear, oddsFormat, callback) {
    const browser = await launchBrowser()
    try {
        const odds = await historicScraper(browser, leagueName, startYear, endYear, oddsFormat, callback);
        return odds

    } catch (error) {
        logger.error("failed scraping")
        logger.error(error)
    }
    finally {
        if (browser) {
            await browser.close();
        }
    }

}

async function nextMatches(leagueName, oddsFormat, callback) {
    const browser = await launchBrowser()
    try {
        const odds = await nextMatchesScraper(browser, leagueName, oddsFormat, callback);
        return odds

    } catch (error) {
        logger.error("failed scraping")
        logger.error(error)
    }
    finally {
        logger.info("closing browser")
        if (browser) {
            await browser.close();
        }
    }
}
export { historicOdds, nextMatches }