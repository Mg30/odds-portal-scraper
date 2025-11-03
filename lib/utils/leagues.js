import { leaguesUrlsMap } from "../constants.js";

/**
 * Builds the list of historic season URLs for the provided league and year span.
 *
 * @param {string} leagueName
 * @param {number|string} startYear
 * @param {number|string} endYear
 * @returns {string[]}
 */
export function getHistoricUrls(leagueName, startYear, endYear) {
    const leagueInfo = leaguesUrlsMap[leagueName];
    if (!leagueInfo) {
        throw new Error(`League '${leagueName}' is not referenced`);
    }

    const { url, fixedStructure } = leagueInfo;
    const start = parseInt(startYear, 10);
    const end = parseInt(endYear, 10);

    if (Number.isNaN(start) || Number.isNaN(end)) {
        throw new Error("startYear and endYear must be valid numbers");
    }

    const seasons = [];
    for (let year = start; year <= end; year += 1) {
        const seasonPath = fixedStructure
            ? `${url}-${year}/results/`
            : `${url}-${year}-${year + 1}/results/`;
        seasons.push(seasonPath);
    }

    return seasons;
}

/**
 * Retrieves the base URL for the provided league.
 *
 * @param {string} leagueName
 * @returns {string}
 */
export function getUrlFrom(leagueName) {
    const { url } = leaguesUrlsMap[leagueName] ?? {};
    if (!url) {
        throw new Error(`League '${leagueName}' is not referenced`);
    }
    return url;
}

/**
 * Convenience helper used by tests to generate a numeric year range.
 *
 * @param {number} startYear
 * @param {number} endYear
 * @returns {number[]}
 */
export function getYearsInRange(startYear, endYear) {
    const years = [];
    for (let year = startYear; year <= endYear; year += 1) {
        years.push(year);
    }
    return years;
}
