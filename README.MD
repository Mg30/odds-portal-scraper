# Odds-portal CLI
A CLI tool for scraping soccer odds from the odds portal site.

## Installation

you can install the odds-portal package globally using npm or yarn:

`npm install -g odds-portal-scraper`

`yarn global add odds-portal-scraper`

## Usage
To use odds-portal, run the odds-portal command followed by the subcommand you want to use.


### Available Commands

#### historic <leagueName> <startYear> <endYear>

`historic <leagueName> <startYear> <endYear>`

Scrape historic odds data for a given soccer league between two years.


* <leagueName>: The name of the soccer league to scrape odds for. Use the leagues command to see available league names.
* <startYear>: The start year of the time range to scrape odds for (e.g. 2019).
* <endYear>: The end year of the time range to scrape odds for (e.g. 2021).
* --odds-format <directory>: the desired odds format
* --output-dir <directory>: The directory to output the scraped odds data as a JSON file.


Example usage:

`odds-portal historic premier-league 2019 2021 --output-dir ./data --odds-format eu`

This will scrape historic odds data for the English Premier League between 2019 and 2021.

#### next-matches <leagueName> 

`next-matches <leagueName>`

Scrape historic odds data for a given soccer league between two years.


* <leagueName>: The name of the soccer league to scrape odds for. Use the leagues command to see available league names.
* --odds-format <directory>: the desired odds format
* --output-dir <directory>: The directory to output the scraped odds data as a JSON file.


Example usage:

`odds-portal next-matches --output-dir ./data --odds-format eu`

This will scrape historic odds data for the English Premier League between 2019 and 2021.

#### soccer-leagues

`odds-portal soccer-leagues` 

Displays a list of available soccer leagues that odds can be scraped for.

Example usage:

`odds-portal soccer-leagues`

#### odds-format

`odds-portal odds-format` 

Displays a list of available odds-format.

Example usage:

`odds-portal odds-format`
## Contributing

If you find any bugs or issues with odds-portal, please open an issue on the GitHub repository. Pull requests are also welcome!

## Licence

This project is licensed under the MIT License.
