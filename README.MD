# Odds-portal CLI
A CLI tool for scraping soccer odds from the odds portal site.

## Installation

you can install the odds-portal package globally using npm or yarn:

`npm install -g odds-portal`

`yarn global add odds-portal`

## Usage
To use odds-portal, run the odds-portal command followed by the subcommand you want to use.


### Available Commands

`historic <leagueName> <startYear> <endYear>`

Scrape historic odds data for a given soccer league between two years. The leagueName argument should be one of the following: premier-league, ligue-1, or bundesliga. The startYear and endYear arguments should be integers representing the start and end years, respectively.

Example usage:

`odds-portal historic premier-league 2018 2020`

This will scrape historic odds data for the English Premier League between 2018 and 2020.

## Contributing

If you find any bugs or issues with odds-portal, please open an issue on the GitHub repository. Pull requests are also welcome!

## Licence

This project is licensed under the MIT License.
