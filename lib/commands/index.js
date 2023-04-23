import {historicScraper} from '../scrapers.js'
import launchPuppeteer from '../puppeteer.js';
import logger from '../logger.js';

export async function historicOdds(leagueName, startYear, endYear) {
    const browser = await launchPuppeteer()
    try {
        const odds = await historicScraper(browser, leagueName, startYear, endYear);
        return odds
        
    } catch (error) {
        logger.error("failed scraping")
        logger.error(error)
    }
    finally{
        logger.info("closing browser")
        browser.close()
    }

}