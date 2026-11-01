# Odds Portal Scraper

A Node.js CLI for collecting historical and upcoming soccer odds from
[OddsPortal](https://www.oddsportal.com/) with Playwright. Export one JSON record
per match to a local directory or an Amazon S3 bucket.

The scraper collects three-way moneyline odds for full time and both halves,
plus over/under markets for 1.5, 2.5, and 3.5 goals. League URLs and odds formats
are defined in [lib/constants.js](lib/constants.js).

## Setup

Install Node.js and npm, then install the dependencies and Chromium browser from
a source checkout:

```bash
git clone https://github.com/Mg30/odds-portal-scraper.git
cd odds-portal-scraper
npm ci
npx playwright install chromium
node index.js --help
```

Playwright requires a browser binary matching the installed library version.
See its [browser setup guide](https://playwright.dev/docs/browsers) for operating
system dependencies.

The package is also available on
[npm](https://www.npmjs.com/package/odds-portal-scraper). A global installation
provides the `odds-portal` command:

```bash
npm install -g odds-portal-scraper
odds-portal --help
```

The examples below use the source checkout. A global installation also needs
the Chromium binary for its installed Playwright version. The published package
and `develop` branch may differ.

## Quick start

List the supported league identifiers and format codes without scraping:

```bash
node index.js soccer-leagues
node index.js odds-format
```

Create the destination directory before collecting upcoming matches:

```bash
mkdir -p ./data
node index.js next-matches premier-league --odds-format eu --local ./data
```

For historical seasons:

```bash
node index.js historic premier-league 2020 2023 --odds-format eu --local ./data
```

The historical range is inclusive of season start years. For example,
`premier-league 2020 2023` requests the 2020–2021 through 2023–2024 seasons.
Some leagues use single-year season URLs.

## Commands and options

| Command | Purpose |
| --- | --- |
| `historic <leagueName> <startYear> <endYear>` | Collect odds for a range of historical seasons |
| `next-matches <leagueName>` | Collect odds from the league's upcoming-match listing |
| `soccer-leagues` | List configured league identifiers |
| `odds-format` | List configured odds format codes |

Both scraping commands require `--odds-format <format>` and exactly one output
destination:

| Option | Meaning |
| --- | --- |
| `--odds-format <format>` | Required; use a lower-case code: `eu`, `us`, `uk`, `hk`, `ma`, or `in` |
| `--local <directory>` | Write JSON files to an existing directory |
| `--s3 <bucketName>` | Upload JSON objects to an existing S3 bucket |

There is no default odds format. Omitting both output destinations does not
start a scrape. Do not combine `--local` and `--s3`.

For S3, configure an AWS region and credentials with permission to write to the
chosen bucket. The exporter uses the AWS SDK's
[default credential provider chain](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/setting-credentials-node.html);
installing the AWS CLI is not required by the application.

```bash
AWS_REGION=eu-west-1 AWS_PROFILE=my-profile node index.js next-matches premier-league --odds-format eu --s3 my-bucket
```

## Configuration

| Variable | Purpose |
| --- | --- |
| `LOG_LEVEL` | Winston logging level; defaults to `info` |
| `ODDS_PORTAL_PROXY_URL` | Optional proxy URL passed to the browser configuration |
| `AWS_REGION` | Region used by the S3 client |
| `AWS_PROFILE` | Optional shared AWS profile selected through the SDK |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_SESSION_TOKEN` | Alternative environment-based AWS credentials; the session token is used for temporary credentials |

The CLI reads the process environment; it does **not** automatically load
`.env`. [.env.example](.env.example) is a non-secret reference template.
Export variables in your shell or supply them through your process manager:

```bash
LOG_LEVEL=debug node index.js soccer-leagues
```

Local `.env` files are ignored by Git. Keep credentials and proxy passwords out
of committed configuration.

## Output

Each exported file or S3 object contains one match record. This is an
illustrative record, with empty arrays for markets not shown:

```json
{
  "scrapedAt": "2023-10-15 14:30:00",
  "leagueName": "premier-league",
  "day": "Sunday",
  "date": "2023-10-15",
  "time": "14:00",
  "homeTeam": "Example Home",
  "awayTeam": "Example Away",
  "mlFirstHalf": [],
  "mlSecondHalf": [],
  "mlFullTime": [
    {"bookMakerName": "Example Bookmaker", "hw": "2.10", "d": "3.25", "aw": "3.50"}
  ],
  "underOver25": [
    {"bookmakerName": "Example Bookmaker", "oddsOver": "1.80", "oddsUnder": "2.00"}
  ],
  "underOver15": [],
  "underOver35": []
}
```

The two bookmaker-name spellings above reflect the current output fields.
Odds are strings as displayed on the site. Field availability and date/time
text depend on the page; metadata extraction has fallback values. Filenames
are built from the match date and team names.

## Development and current limits

`package.json` does not declare a Node.js engine range. The existing workflow
configures Node.js 20; it is not a compatibility matrix.

```bash
npm ci
npm test -- --runInBand --runTestsByPath tests/exporters.test.js
```

The exporter tests use a mocked S3 client and local temporary files. The full
suite also includes browser tests and a live OddsPortal integration test.
Install Chromium before running it; the CLI test additionally expects
`odds-portal` on `PATH` (the existing workflow uses `npm link`).

The scraper depends on third-party page structure and availability. Retries and
logging exist, but do not guarantee complete exports or a nonzero exit status
for every failure. See the [presentation audit](docs/presentation-audit.md) for
documentation corrections and implementation issues left outside this cleanup.

## License

The source package metadata and the published npm package declare **ISC**.
There is currently no standalone license file in this repository. The previous
README's MIT claim and link to a nonexistent license file have been removed.

## Support and contributions

Report bugs or request features through
[GitHub Issues](https://github.com/Mg30/odds-portal-scraper/issues).
For scraping failures, include the command, relevant versions, and sanitized
logs. Submit contributions as pull requests against `develop`.
