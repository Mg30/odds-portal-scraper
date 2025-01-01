# Odds Portal Scraper CLI

A command line tool for scraping soccer odds data from [Odds Portal](https://www.oddsportal.com/). The tool supports both historical odds data and upcoming matches across multiple leagues and formats.

## Features

- Scrape historical odds data for specified date ranges
- Get odds for upcoming matches
- Support for multiple leagues and odds formats
- Export data to local files or S3 buckets
- Built with Puppeteer for reliable scraping
- Configurable logging and error handling

## Installation

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- AWS CLI configured (for S3 exports)

### Install via npm

```bash
npm install -g odds-portal-scraper
```

### Install via yarn

```bash
yarn global add odds-portal-scraper
```

## Usage

### Commands Overview

```bash
odds-portal [command] [options]
```

#### Available Commands

| Command         | Description                                      |
|-----------------|--------------------------------------------------|
| historic        | Scrape historical odds data                     |
| next-matches    | Scrape odds for upcoming matches                |
| soccer-leagues  | List available leagues                          |
| odds-format     | List supported odds formats                     |

### Command Details

#### Historic Odds

Scrape historical odds data for a specified league and date range.

```bash
odds-portal historic <leagueName> <startYear> <endYear> [options]
```

**Parameters:**

- `leagueName`: Name of the league (use `soccer-leagues` command to see available options)
- `startYear`: Starting year for historical data (e.g., 2020)
- `endYear`: Ending year for historical data (e.g., 2023)

**Options:**

| Option          | Description                                      |
|-----------------|--------------------------------------------------|
| --odds-format   | Odds format (default: EU)                       |
| --local         | Local directory to save JSON files              |
| --s3            | S3 bucket name to upload data                   |

**Example:**

```bash
odds-portal historic premier-league 2020 2023 --local ./data --odds-format eu
```

#### next-matches <leagueName>

Scrape odds for upcoming matches in a specified league.

Scrape next matches odds data for a given soccer league.

**Parameters:**

- `leagueName`: Name of the league (use `soccer-leagues` command to see available options)

**Options:**

| Option          | Description                                      |
|-----------------|--------------------------------------------------|
| --odds-format   | Odds format (default: EU)                       |
| --local         | Local directory to save JSON files              |
| --s3            | S3 bucket name to upload data                   |

`odds-portal next-matches premier-league --local ./data --odds-format eu`

This will scrape next matches odds data for the English Premier League.

#### Soccer Leagues

List all available leagues for scraping.

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

| Variable               | Description                                      |
|------------------------|--------------------------------------------------|
| ODDS_PORTAL_PROXY_URL  | Proxy URL for scraping                          |
| AWS_ACCESS_KEY_ID      | AWS access key for S3 exports                   |
| AWS_SECRET_ACCESS_KEY  | AWS secret key for S3 exports                   |

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

The tool includes comprehensive error handling with the following features:

- Automatic retries for failed requests
- Detailed error logging
- Graceful shutdown on critical errors
- Validation of input parameters

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a new branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -am 'Add some feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Create a new Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support or feature requests, please open an issue on the [GitHub repository](https://github.com/your-repo/odds-portal-scraper).
