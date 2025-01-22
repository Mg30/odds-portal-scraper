// constants.js
const BASE_URL = "https://www.oddsportal.com";

const leaguesUrlsMap = {
    "premier-league": { url: `${BASE_URL}/soccer/england/premier-league`, fixedStructure: true },
    "ligue-1": { url: `${BASE_URL}/soccer/france/ligue-1`, fixedStructure: false },
    "bundesliga": { url: `${BASE_URL}/soccer/germany/bundesliga`, fixedStructure: true },
    "championship": { url: `${BASE_URL}/football/england/championship`, fixedStructure: true },
    "liga": { url: `${BASE_URL}/football/spain/laliga`, fixedStructure: true },
    "serie-a": { url: `${BASE_URL}/football/italy/serie-a`, fixedStructure: true },
    "mls": { url: `${BASE_URL}/football/usa/mls`, fixedStructure: true },
    "brazil-serie-a": { url: `${BASE_URL}/football/brazil/serie-a`, fixedStructure: true },
    "liga-mx": { url: `${BASE_URL}/football/mexico/liga-mx`, fixedStructure: false },
    "liga-portugal": { url: `${BASE_URL}/football/portugal/liga-portugal`, fixedStructure: true },
    "eredivisie": { url: `${BASE_URL}/football/netherlands/eredivisie`, fixedStructure: true },
    "belgian": { url: `${BASE_URL}/football/belgium/jupiler-pro-league`, fixedStructure: false },
    "ligue2": { url: `${BASE_URL}/football/france/ligue-2`, fixedStructure: false },
    "serie-b": { url: `${BASE_URL}/football/italy/serie-b`, fixedStructure: false },
    "liga2": { url: `${BASE_URL}/football/spain/laliga2`, fixedStructure: false },
    "bundesliga-2": { url: `${BASE_URL}/football/germany/2-bundesliga`, fixedStructure: false },
    "argentina": { url: `${BASE_URL}/football/argentina/liga-profesional`, fixedStructure: false },
    "champions-league": { url: `${BASE_URL}/football/europe/champions-league`, fixedStructure: false },
    "europa-league": { url: `${BASE_URL}/football/europe/europa-league`, fixedStructure: false }
};

const oddsFormatMap = {
    "eu": "Decimal Odds (1.50)",
    "us": "Money Line Odds (-200)",
    "uk": "Fractional Odds (1/2)",
    "hk": "Hong Kong Odds (0.50)",
    "ma": "Malay Odds (0.50)",
    "in": "Indonesian Odds (-2.00)",
};


export { leaguesUrlsMap, oddsFormatMap };
