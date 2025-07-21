
# Odds Portal Scraper CLI

Odds Portal Scraper CLI is a powerful command line tool for extracting soccer odds data from [Odds Portal](https://www.oddsportal.com/). It supports scraping both historical and upcoming match odds across multiple leagues and formats, with flexible export options and robust error handling.


## Features

- Scrape historical odds data for specified date ranges
- Scrape odds for upcoming matches
- Supports multiple soccer leagues and odds formats (EU, UK, US, etc.)
- Export data to local files (JSON) or directly to AWS S3 buckets
- Built with Playwright for fast and reliable scraping
- Configurable logging and error handling
- Automatic retries and input validation


## Installation

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- AWS CLI configured (for S3 exports, if using S3)


### Install via npm

```bash
npm install -g odds-portal-scraper
```

### Install via yarn

```bash
yarn global add odds-portal-scraper
```


## Usage

### Command Overview

```bash
odds-portal [command] [options]
```

#### Available Commands

| Command         | Description                                      |
|-----------------|--------------------------------------------------|
| historic        | Scrape historical odds data for a league         |
| next-matches    | Scrape odds for upcoming matches in a league     |
| soccer-leagues  | List all available soccer leagues                |
| odds-format     | List all supported odds formats                  |


### Command Details

#### Historic Odds

Scrape historical odds data for a specified league and date range.

```bash
odds-portal historic <leagueName> <startYear> <endYear> [options]
```

**Parameters:**

- `leagueName`: Name of the league (use `soccer-leagues` to list options)
- `startYear`: Starting year for historical data (e.g., 2020)
- `endYear`: Ending year for historical data (e.g., 2023)

**Options:**

| Option          | Description                                      |
|-----------------|--------------------------------------------------|
| --odds-format   | Odds format (default: EU)                        |
| --local         | Local directory to save JSON files                |
| --s3            | S3 bucket name to upload data                     |

**Example:**

```bash
odds-portal historic premier-league 2020 2023 --local ./data --odds-format eu
```


#### Next Matches

Scrape odds for upcoming matches in a specified league.

```bash
odds-portal next-matches <leagueName> [options]
```

**Parameters:**

- `leagueName`: Name of the league (use `soccer-leagues` to list options)

**Options:**

| Option          | Description                                      |
|-----------------|--------------------------------------------------|
| --odds-format   | Odds format (default: EU)                        |
| --local         | Local directory to save JSON files                |
| --s3            | S3 bucket name to upload data                     |

**Example:**

```bash
odds-portal next-matches premier-league --local ./data --odds-format eu
```

This will scrape odds for upcoming matches in the English Premier League.


#### Soccer Leagues

List all available soccer leagues for scraping.

```bash
odds-portal soccer-leagues
```


#### Odds Formats

List all supported odds formats.

```bash
odds-portal odds-format
```


## Configuration

### Environment Variables

Set the following environment variables as needed:

| Variable               | Description                                      |
|------------------------|--------------------------------------------------|
| ODDS_PORTAL_PROXY_URL  | Proxy URL for scraping (optional)                |
| AWS_ACCESS_KEY_ID      | AWS access key for S3 exports                    |
| AWS_SECRET_ACCESS_KEY  | AWS secret key for S3 exports                    |


## Data Structure

Scraped data is saved in JSON format with the following structure:

```json
{
  "scrapedAt": "2023-10-15 14:30:00",
  "day": "Sunday",
  "date": "2023-10-15",
  "time": "14:00",
  "homeTeam": "Manchester United",
  "awayTeam": "Liverpool",
  "mlFirstHalf": [
    {
      "bookMakerName": "Bet365",
      "hw": "2.10",
      "d": "3.25",
      "aw": "3.50"
    }
  ],
  "mlSecondHalf": [...],
  "mlFullTime": [...],
  "leagueName": "premier-league",
  "underOver25": [
    {
      "bookmakerName": "Bet365",
      "oddsOver": "1.80",
      "oddsUnder": "2.00"
    }
  ],
  "underOver15": [...],
  "underOver35": [...]
}
```


## Error Handling

Odds Portal Scraper CLI includes comprehensive error handling:

- Automatic retries for failed requests
- Detailed error logging
- Graceful shutdown on critical errors
- Input parameter validation


## Contributing

Contributions are welcome! To contribute:

1. Fork the repository
2. Create a new branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -am 'Add some feature'`)
4. Push to your branch (`git push origin feature/your-feature`)
5. Open a Pull Request


## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.


## Support

For support or feature requests, please open an issue on the [GitHub repository](https://github.com/your-repo/odds-portal-scraper).
