import {historicScraper} from '../scrapers.js'
import launchPuppeteer from '../puppeteer.js';


export async function historicOdds(leagueName, startYear, endYear) {
    const browser = await launchPuppeteer()
    try {
        const odds = await historicScraper(browser, leagueName, startYear, endYear);
        return odds
        
    } catch (error) {
        console.error(error)
    }
    finally{
        console.info("closing browser")
        browser.close()
    }

}